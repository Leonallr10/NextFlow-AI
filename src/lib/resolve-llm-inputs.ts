import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-defaults";
import type { WorkflowInput } from "@/lib/workflow-schema";

type WorkflowNode = WorkflowInput["nodes"][number];

function getOutputOrStaticData(
  sourceId: string,
  nodes: WorkflowNode[],
  outputsByNodeId: Map<string, unknown>,
): unknown {
  if (outputsByNodeId.has(sourceId)) {
    return outputsByNodeId.get(sourceId);
  }
  const node = nodes.find((n) => n.id === sourceId);
  if (!node) return undefined;
  const d = (node.data ?? {}) as Record<string, unknown>;
  switch (node.type) {
    case "text":
      return String(d.text ?? "");
    case "upload_image":
    case "upload_video":
      return String(d.url ?? "");
    default:
      return undefined;
  }
}

/** Normalize upstream value to plain text (LLM system / user strings). */
export function valueToText(out: unknown): string {
  if (out == null) return "";
  if (typeof out === "string") return out;
  if (typeof out === "object" && out !== null && "imageUrl" in out) {
    return String((out as { imageUrl?: string }).imageUrl ?? "");
  }
  return String(out);
}

/** Get a public URL for vision parts (image). */
export function valueToImageUrl(out: unknown): string | null {
  if (typeof out === "string" && /^https?:\/\//i.test(out.trim())) {
    return out.trim();
  }
  if (out && typeof out === "object" && "imageUrl" in out) {
    const u = String((out as { imageUrl?: string }).imageUrl ?? "");
    return /^https?:\/\//i.test(u) ? u : null;
  }
  return null;
}

export type ResolvedLlmInputs = {
  model: string;
  systemInstruction?: string;
  userMessage: string;
  imageUrls: string[];
  /** For persistence / debugging */
  resolvedEdges: Array<{
    source: string;
    targetHandle: string | undefined;
    snippet: string;
  }>;
};

/**
 * Walk incoming edges to an LLM node and aggregate text + image URLs per handle.
 */
export function resolveLlmInputs(
  workflow: WorkflowInput,
  llmNodeId: string,
  outputsByNodeId: Map<string, unknown>,
): ResolvedLlmInputs {
  const node = workflow.nodes.find((n) => n.id === llmNodeId);
  const model = String((node?.data as Record<string, unknown> | undefined)?.model ?? DEFAULT_GEMINI_MODEL);

  const systemParts: string[] = [];
  const userParts: string[] = [];
  const imageUrls: string[] = [];
  const resolvedEdges: ResolvedLlmInputs["resolvedEdges"] = [];

  const incoming = workflow.edges.filter((e) => e.target === llmNodeId);

  for (const edge of incoming) {
    const raw = getOutputOrStaticData(edge.source, workflow.nodes, outputsByNodeId);
    const handle = edge.targetHandle ?? "user_message";

    if (handle === "system_prompt") {
      const t = valueToText(raw);
      if (t) systemParts.push(t);
      resolvedEdges.push({ source: edge.source, targetHandle: edge.targetHandle, snippet: t.slice(0, 200) });
    } else if (handle === "user_message") {
      const t = valueToText(raw);
      if (t) userParts.push(t);
      resolvedEdges.push({ source: edge.source, targetHandle: edge.targetHandle, snippet: t.slice(0, 200) });
    } else if (handle === "images") {
      const url = valueToImageUrl(raw);
      if (url) imageUrls.push(url);
      resolvedEdges.push({
        source: edge.source,
        targetHandle: edge.targetHandle,
        snippet: url ?? "",
      });
    } else {
      const t = valueToText(raw);
      if (t) userParts.push(t);
      resolvedEdges.push({ source: edge.source, targetHandle: edge.targetHandle, snippet: t.slice(0, 200) });
    }
  }

  const systemInstruction = systemParts.length ? systemParts.join("\n\n") : undefined;
  const userMessage = userParts.join("\n\n");

  return {
    model,
    systemInstruction,
    userMessage,
    imageUrls,
    resolvedEdges,
  };
}
