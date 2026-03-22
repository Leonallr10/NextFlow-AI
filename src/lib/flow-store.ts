"use client";

import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";
import type { WorkflowInput } from "@/lib/workflow-schema";
import { workflowToReactFlow } from "@/lib/workflow-import";
import { cloneSampleGraph, SAMPLE_WORKFLOW_NAME } from "@/lib/sample-workflow";

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  /** Shown in Save / Run payloads and stored as the workflow `name` in the database. */
  workflowName: string;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeIds: (nodeIds: string[]) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  /** Removes the node and all attached edges. */
  removeNode: (nodeId: string) => void;
  /** Restores the built-in Product Marketing Kit sample graph (7 nodes, 6 edges). */
  loadSampleWorkflow: () => void;
  /** Replace canvas from a validated workflow payload (e.g. pasted/uploaded JSON). */
  loadFromWorkflowInput: (workflow: WorkflowInput) => void;
  reset: () => void;
};

const initialGraph = cloneSampleGraph();

export const useFlowStore = create<FlowState>((set) => ({
  nodes: initialGraph.nodes,
  edges: initialGraph.edges,
  selectedNodeIds: [],
  workflowName: SAMPLE_WORKFLOW_NAME,
  setWorkflowName: (workflowName) => set({ workflowName }),
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
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    })),
  loadSampleWorkflow: () => {
    const { nodes, edges } = cloneSampleGraph();
    set({ nodes, edges, selectedNodeIds: [], workflowName: SAMPLE_WORKFLOW_NAME });
  },
  loadFromWorkflowInput: (workflow: WorkflowInput) => {
    const { nodes, edges } = workflowToReactFlow(workflow);
    set({
      nodes,
      edges,
      selectedNodeIds: [],
      workflowName: workflow.name,
    });
  },
  reset: () => {
    const { nodes, edges } = cloneSampleGraph();
    set({ nodes, edges, selectedNodeIds: [], workflowName: SAMPLE_WORKFLOW_NAME });
  },
}));
