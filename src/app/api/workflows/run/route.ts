import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { workflowSchema, type WorkflowInput } from "@/lib/workflow-schema";
import { serverLog } from "@/lib/server-log";
import { resolveLlmInputs, valueToImageUrl } from "@/lib/resolve-llm-inputs";
import { executeLlmViaTriggerOrFallback } from "@/lib/trigger-llm";

type RunMode = "full" | "selected" | "single";
type WorkflowNode = WorkflowInput["nodes"][number];

function collectUpstream(nodeId: string, edges: Array<{ source: string; target: string }>, keep: Set<string>) {
  if (keep.has(nodeId)) return;
  keep.add(nodeId);
  const incoming = edges.filter((edge) => edge.target === nodeId);
  for (const edge of incoming) {
    collectUpstream(edge.source, edges, keep);
  }
}

/** Resolve upstream output for a node (same idea as `resolve-llm-inputs` / static fallbacks). */
function getOutputOrStaticUpstream(
  sourceId: string,
  workflow: WorkflowInput,
  outputsByNodeId: Map<string, unknown>,
): unknown {
  if (outputsByNodeId.has(sourceId)) {
    return outputsByNodeId.get(sourceId);
  }
  const n = workflow.nodes.find((item) => item.id === sourceId);
  if (!n) return undefined;
  const nd = (n.data ?? {}) as Record<string, unknown>;
  switch (n.type) {
    case "text":
      return String(nd.text ?? "");
    case "upload_image":
    case "upload_video":
      return String(nd.url ?? "");
    default:
      return undefined;
  }
}

function getUpstreamForTarget(
  workflow: WorkflowInput,
  targetNodeId: string,
  outputsByNodeId: Map<string, unknown>,
  preferredHandle?: string,
): unknown {
  const incoming = workflow.edges.filter((e) => e.target === targetNodeId);
  const ordered =
    preferredHandle != null
      ? [...incoming].sort((a, b) => {
          const ap = a.targetHandle === preferredHandle ? 0 : 1;
          const bp = b.targetHandle === preferredHandle ? 0 : 1;
          return ap - bp;
        })
      : incoming;
  for (const edge of ordered) {
    const v = getOutputOrStaticUpstream(edge.source, workflow, outputsByNodeId);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** Stub extract: real FFmpeg/Transloadit not wired yet — must be a fetchable image URL for Gemini. */
const DEFAULT_STUB_FRAME_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg";

function levelsForExecution(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): string[][] {
  const ids = new Set(nodeIds);
  const incoming = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const id of nodeIds) {
    incoming.set(id, 0);
    children.set(id, []);
  }
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
  }
  const levels: string[][] = [];
  let queue = nodeIds.filter((id) => (incoming.get(id) ?? 0) === 0);
  while (queue.length) {
    levels.push(queue);
    const next: string[] = [];
    for (const id of queue) {
      for (const child of children.get(id) ?? []) {
        const count = (incoming.get(child) ?? 1) - 1;
        incoming.set(child, count);
        if (count === 0) next.push(child);
      }
    }
    queue = next;
  }
  return levels;
}

async function executeNode(
  node: WorkflowNode,
  workflow: WorkflowInput,
  outputsByNodeId: Map<string, unknown>,
): Promise<{ output: unknown; durationMs: number; input?: unknown }> {
  const startedAt = Date.now();
  const d = (node.data ?? {}) as Record<string, unknown>;

  switch (node.type) {
    case "text":
      return {
        output: String(d.text ?? ""),
        durationMs: Date.now() - startedAt,
        input: { text: d.text ?? "" },
      };
    case "upload_image":
    case "upload_video":
      return {
        output: String(d.url ?? ""),
        durationMs: Date.now() - startedAt,
        input: { url: d.url ?? "" },
      };
    case "crop_image": {
      const raw = getUpstreamForTarget(workflow, node.id, outputsByNodeId, "image_url");
      let imageUrl = valueToImageUrl(raw);
      if (!imageUrl) {
        const manual = String(d.imageUrl ?? "").trim();
        if (/^https?:\/\//i.test(manual)) imageUrl = manual;
      }
      if (!imageUrl) {
        throw new Error(
          "Crop node: connect an Upload Image (or upstream image) or set a valid https image URL in node data.",
        );
      }
      // Stub: pass-through image URL (real crop would call Transloadit / sharp here).
      return {
        output: { imageUrl },
        durationMs: Date.now() - startedAt,
        input: { ...d, resolvedImageUrl: imageUrl },
      };
    }
    case "extract_frame": {
      const raw = getUpstreamForTarget(workflow, node.id, outputsByNodeId, "video_url");
      const videoUrl =
        typeof raw === "string" && raw.trim()
          ? raw.trim()
          : String((d as { videoUrl?: string }).videoUrl ?? d.url ?? "").trim();
      const stubFrameUrl =
        process.env.NEXTFLOW_STUB_FRAME_IMAGE_URL?.trim() || DEFAULT_STUB_FRAME_IMAGE_URL;
      return {
        output: { imageUrl: stubFrameUrl },
        durationMs: Date.now() - startedAt,
        input: { ...d, resolvedVideoUrl: videoUrl || undefined, stubNote: "frame extraction stub" },
      };
    }
    case "llm": {
      const resolved = resolveLlmInputs(workflow, node.id, outputsByNodeId);
      if (!resolved.userMessage.trim()) {
        throw new Error(
          'LLM node requires a non-empty user_message: connect a Text node to the "user_message" handle.',
        );
      }
      const { text } = await executeLlmViaTriggerOrFallback({
        model: resolved.model,
        systemInstruction: resolved.systemInstruction,
        userMessage: resolved.userMessage,
        imageUrls: resolved.imageUrls,
      });
      return {
        output: text,
        durationMs: Date.now() - startedAt,
        input: {
          model: resolved.model,
          systemInstruction: resolved.systemInstruction,
          userMessage: resolved.userMessage,
          imageUrls: resolved.imageUrls,
          resolvedEdges: resolved.resolvedEdges,
        },
      };
    }
    default:
      return { output: node.data ?? null, durationMs: Date.now() - startedAt, input: node.data };
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    mode?: RunMode;
    nodeIds?: string[];
    workflowId?: string;
    workflow?: unknown;
  };
  const mode = body.mode ?? "full";
  let graph = body.workflow;

  if (!graph && body.workflowId && process.env.DATABASE_URL) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: body.workflowId },
    });
    if (workflow && "userId" in (workflow as unknown as Record<string, unknown>)) {
      const ownerId = (workflow as unknown as Record<string, unknown>).userId;
      if (ownerId && ownerId !== userId) {
        return NextResponse.json({ ok: false, error: "Workflow not found" }, { status: 404 });
      }
    }
    graph = workflow?.graphJson;
  }
  const parsed = workflowSchema.safeParse(graph);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid workflow payload" }, { status: 400 });
  }
  const workflow = parsed.data;
  const selectedIds = body.nodeIds ?? [];
  let runNodeIds = workflow.nodes.map((node) => node.id);
  if (mode === "single" || mode === "selected") {
    if (selectedIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "nodeIds are required for single/selected modes" },
        { status: 400 },
      );
    }
    const include = new Set<string>();
    for (const nodeId of selectedIds) {
      collectUpstream(
        nodeId,
        workflow.edges.map((edge) => ({ source: edge.source, target: edge.target })),
        include,
      );
    }
    runNodeIds = Array.from(include);
  }

  serverLog("api/workflows/run POST", {
    userId,
    mode,
    workflowName: workflow.name,
    nodesInGraph: workflow.nodes.length,
    edgesInGraph: workflow.edges.length,
    nodesToExecute: runNodeIds.length,
  });

  const startedAt = Date.now();
  const outputsByNodeId = new Map<string, unknown>();
  const levels = levelsForExecution(
    runNodeIds,
    workflow.edges.map((edge) => ({ source: edge.source, target: edge.target })),
  );
  const nodeResults: Array<Record<string, unknown>> = [];

  for (const level of levels) {
    const levelResults = await Promise.all(
      level.map(async (nodeId) => {
        const node = workflow.nodes.find((item) => item.id === nodeId);
        if (!node) {
          return null;
        }
        const localStartedAt = Date.now();
        try {
          const result = await executeNode(node, workflow, outputsByNodeId);
          outputsByNodeId.set(nodeId, result.output);
          return {
            nodeId,
            nodeType: node.type,
            status: "success",
            startedAt: new Date(localStartedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: result.durationMs,
            input: result.input ?? node.data ?? {},
            output: result.output,
          };
        } catch (error) {
          return {
            nodeId,
            nodeType: node.type,
            status: "failed",
            startedAt: new Date(localStartedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - localStartedAt,
            input: node.data ?? {},
            output: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );
    nodeResults.push(...(levelResults.filter(Boolean) as Array<Record<string, unknown>>));
  }

  const durationMs = Date.now() - startedAt;
  const status = nodeResults.some((entry) => entry.status === "failed") ? "failed" : "success";
  let persistedRun: Record<string, unknown> | null = null;
  const graphJson = JSON.parse(JSON.stringify(workflow)) as object;
  if (process.env.DATABASE_URL) {
    try {
      const workflowRef = body.workflowId
        ? await prisma.workflow.findUnique({ where: { id: body.workflowId }, select: { id: true } })
        : null;
      const createdRun = await (
        prisma as unknown as {
          workflowRun: { create: (args: object) => Promise<unknown> };
        }
      ).workflowRun.create({
        data: {
          workflowId: workflowRef?.id,
          userId,
          mode,
          status,
          durationMs,
          finishedAt: new Date(),
          graphJson,
          nodeRuns: {
            create: nodeResults.map((nodeRun) => ({
              nodeId: String(nodeRun.nodeId),
              nodeType: String(nodeRun.nodeType),
              status: String(nodeRun.status),
              durationMs: Number(nodeRun.durationMs ?? 0),
              finishedAt: new Date(String(nodeRun.finishedAt)),
              inputJson: (nodeRun.input as object) ?? {},
              outputJson: (nodeRun.output as object) ?? {},
              error: nodeRun.error ? String(nodeRun.error) : null,
            })),
          },
        },
        include: { nodeRuns: true },
      });
      persistedRun = createdRun as Record<string, unknown>;
    } catch {
      persistedRun = null;
    }
  }

  const runId =
    persistedRun && typeof persistedRun === "object" && "id" in persistedRun
      ? String(persistedRun.id)
      : null;
  serverLog("api/workflows/run complete", {
    userId,
    mode,
    status,
    durationMs,
    nodeRunCount: nodeResults.length,
    persistedRunId: runId,
    dbPersisted: Boolean(persistedRun),
  });

  const nodeOutputs = Object.fromEntries(outputsByNodeId);

  return NextResponse.json({
    ok: true,
    run:
      persistedRun ??
      ({
        id: `local-${Date.now()}`,
        mode,
        status,
        durationMs,
        nodeRuns: nodeResults,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
      } as Record<string, unknown>),
    nodeOutputs,
  });
}
