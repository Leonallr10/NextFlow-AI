import type { Edge, Node } from "@xyflow/react";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-defaults";
import type { WorkflowInput } from "@/lib/workflow-schema";

/**
 * Product Marketing Kit Generator — sample graph (all 6 node types).
 * Use for demos, tests, or POST /api/workflows body.
 */
export const SAMPLE_WORKFLOW_NAME = "Product Marketing Kit Generator";

export const sampleNodes: Node[] = [
  {
    id: "text-system-1",
    position: { x: 40, y: 80 },
    type: "text",
    data: { label: "System Prompt", text: "You are a social media manager." },
  },
  {
    id: "text-user-1",
    position: { x: 40, y: 260 },
    type: "text",
    data: { label: "User Message", text: "Create a launch post for this product." },
  },
  {
    id: "upload-image-1",
    position: { x: 360, y: 80 },
    type: "upload_image",
    data: {
      label: "Upload Image",
      url: "https://cdn.searchenginejournal.com/wp-content/uploads/2021/08/top-5-reasons-why-you-need-a-social-media-manager-616015983b3ba-sej.png",
    },
  },
  {
    id: "upload-video-1",
    position: { x: 360, y: 280 },
    type: "upload_video",
    data: { label: "Upload Video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  },
  {
    id: "crop-1",
    position: { x: 670, y: 80 },
    type: "crop_image",
    data: {
      label: "Crop Image",
      xPercent: "0",
      yPercent: "0",
      widthPercent: "100",
      heightPercent: "100",
    },
  },
  {
    id: "extract-1",
    position: { x: 670, y: 280 },
    type: "extract_frame",
    data: { label: "Extract Frame", timestamp: "50%" },
  },
  {
    id: "llm-1",
    position: { x: 980, y: 170 },
    type: "llm",
    data: { label: "Run Any LLM", model: DEFAULT_GEMINI_MODEL, output: "" },
  },
];

export const sampleEdges: Edge[] = [
  {
    id: "e1",
    source: "text-system-1",
    sourceHandle: "output",
    target: "llm-1",
    targetHandle: "system_prompt",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  {
    id: "e2",
    source: "text-user-1",
    sourceHandle: "output",
    target: "llm-1",
    targetHandle: "user_message",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  {
    id: "e3",
    source: "upload-image-1",
    sourceHandle: "output",
    target: "crop-1",
    targetHandle: "image_url",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  {
    id: "e4",
    source: "crop-1",
    sourceHandle: "output",
    target: "llm-1",
    targetHandle: "images",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  {
    id: "e5",
    source: "upload-video-1",
    sourceHandle: "output",
    target: "extract-1",
    targetHandle: "video_url",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
  {
    id: "e6",
    source: "extract-1",
    sourceHandle: "output",
    target: "llm-1",
    targetHandle: "images",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2 },
  },
];

/** Valid body for `POST /api/workflows` or `POST /api/workflows/run` (`workflow` field). */
export function getSampleWorkflowPayload(): WorkflowInput {
  return {
    name: SAMPLE_WORKFLOW_NAME,
    nodes: sampleNodes.map((node) => ({
      id: node.id,
      type: node.type as WorkflowInput["nodes"][number]["type"],
      label: String((node.data as { label?: string })?.label ?? "Node"),
      data: (node.data as Record<string, unknown>) ?? {},
      position: node.position,
    })),
    edges: sampleEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    })),
  };
}

/** Fresh copies for Zustand (avoid shared mutable references). */
export function cloneSampleGraph(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: structuredClone(sampleNodes),
    edges: structuredClone(sampleEdges),
  };
}
