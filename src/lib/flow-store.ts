"use client";

import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeIds: (nodeIds: string[]) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  reset: () => void;
};

const starterNodes: Node[] = [
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
    data: { label: "Upload Image", url: "" },
  },
  {
    id: "upload-video-1",
    position: { x: 360, y: 280 },
    type: "upload_video",
    data: { label: "Upload Video", url: "" },
  },
  {
    id: "crop-1",
    position: { x: 670, y: 80 },
    type: "crop_image",
    data: { label: "Crop Image", xPercent: "0", yPercent: "0", widthPercent: "100", heightPercent: "100" },
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
    data: { label: "Run Any LLM", model: "gemini-2.0-flash", output: "" },
  },
];

const starterEdges: Edge[] = [
  {
    id: "e1",
    source: "text-system-1",
    sourceHandle: "output",
    target: "llm-1",
    targetHandle: "system_prompt",
    animated: true,
  },
  { id: "e2", source: "text-user-1", sourceHandle: "output", target: "llm-1", targetHandle: "user_message", animated: true },
  { id: "e3", source: "upload-image-1", sourceHandle: "output", target: "crop-1", targetHandle: "image_url", animated: true },
  { id: "e4", source: "crop-1", sourceHandle: "output", target: "llm-1", targetHandle: "images", animated: true },
  { id: "e5", source: "upload-video-1", sourceHandle: "output", target: "extract-1", targetHandle: "video_url", animated: true },
  { id: "e6", source: "extract-1", sourceHandle: "output", target: "llm-1", targetHandle: "images", animated: true },
];

export const useFlowStore = create<FlowState>((set) => ({
  nodes: starterNodes,
  edges: starterEdges,
  selectedNodeIds: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeIds: (selectedNodeIds) => set({ selectedNodeIds }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNodeData: (nodeId, patch) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: { ...(node.data as Record<string, unknown>), ...patch },
            }
          : node,
      ),
    })),
  reset: () => set({ nodes: starterNodes, edges: starterEdges, selectedNodeIds: [] }),
}));
