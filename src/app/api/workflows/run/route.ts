import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { workflowSchema } from "@/lib/workflow-schema";

type RunMode = "full" | "selected" | "single";

function collectUpstream(nodeId: string, edges: Array<{ source: string; target: string }>, keep: Set<string>) {
  if (keep.has(nodeId)) return;
  keep.add(nodeId);
  const incoming = edges.filter((edge) => edge.target === nodeId);
  for (const edge of incoming) {
    collectUpstream(edge.source, edges, keep);
  }
}

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

async function executeNode(node: { id: string; type: string; data?: Record<string, unknown> }) {
  const startedAt = Date.now();
  if (node.type === "llm") {
    const output = `Generated response for ${node.id}`;
    return { output, durationMs: Date.now() - startedAt };
  }
  if (node.type === "crop_image") {
    const output = { imageUrl: String(node.data?.imageUrl ?? "https://example.com/cropped.jpg") };
    return { output, durationMs: Date.now() - startedAt };
  }
  if (node.type === "extract_frame") {
    const output = { imageUrl: String(node.data?.imageUrl ?? "https://example.com/frame.jpg") };
    return { output, durationMs: Date.now() - startedAt };
  }
  return { output: node.data ?? null, durationMs: Date.now() - startedAt };
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

  const startedAt = Date.now();
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
          const result = await executeNode(node);
          return {
            nodeId,
            nodeType: node.type,
            status: "success",
            startedAt: new Date(localStartedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: result.durationMs,
            input: node.data ?? {},
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
    nodeResults.push(...levelResults.filter(Boolean) as Array<Record<string, unknown>>);
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

  return NextResponse.json({
    ok: true,
    run: persistedRun ?? {
      id: `local-${Date.now()}`,
      mode,
      status,
      durationMs,
      nodeRuns: nodeResults,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
    },
  });
}
