"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Connection,
  type EdgeChange,
  type NodeProps,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFlowStore } from "@/lib/flow-store";
import type { WorkflowInput } from "@/lib/workflow-schema";

const nodeTemplates = [
  { label: "Text Node", type: "text" },
  { label: "Upload Image Node", type: "upload_image" },
  { label: "Upload Video Node", type: "upload_video" },
  { label: "Run Any LLM Node", type: "llm" },
  { label: "Crop Image Node", type: "crop_image" },
  { label: "Extract Frame from Video Node", type: "extract_frame" },
];

type EditorNodeData = {
  label: string;
  [key: string]: unknown;
};

function BaseNode({
  id,
  data,
  children,
}: {
  id: string;
  data: EditorNodeData;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-[220px] rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-zinc-100 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{id}</p>
      <p className="mt-1 text-sm font-medium">{data.label}</p>
      {children}
    </div>
  );
}

function TextNode({ id, data }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data}>
      <Handle id="output" type="source" position={Position.Right} />
      <textarea
        className="mt-2 w-full rounded bg-zinc-800 p-2 text-xs"
        rows={4}
        value={String(data.text ?? "")}
        onChange={(event) => updateNodeData(id, { text: event.target.value })}
      />
    </BaseNode>
  );
}

function UploadNode({ id, data, accept, inputHandleId }: NodeProps<Node<EditorNodeData>> & { accept: string; inputHandleId?: string }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data}>
      {inputHandleId ? <Handle id={inputHandleId} type="target" position={Position.Left} /> : null}
      <Handle id="output" type="source" position={Position.Right} />
      <input
        className="mt-2 w-full rounded bg-zinc-800 p-2 text-xs"
        placeholder="https://..."
        value={String(data.url ?? "")}
        onChange={(event) => updateNodeData(id, { url: event.target.value })}
      />
      <p className="mt-1 text-[10px] text-zinc-400">Accepts: {accept}</p>
    </BaseNode>
  );
}

function LlmNode({ id, data }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data}>
      <Handle id="system_prompt" type="target" position={Position.Left} style={{ top: 30 }} />
      <Handle id="user_message" type="target" position={Position.Left} style={{ top: 58 }} />
      <Handle id="images" type="target" position={Position.Left} style={{ top: 86 }} />
      <Handle id="output" type="source" position={Position.Right} />
      <input
        className="mt-2 w-full rounded bg-zinc-800 p-2 text-xs"
        value={String(data.model ?? "gemini-2.0-flash")}
        onChange={(event) => updateNodeData(id, { model: event.target.value })}
      />
      <div className="mt-2 rounded bg-zinc-800 p-2 text-xs text-zinc-300">
        {String(data.output ?? "Run workflow to see output inline")}
      </div>
    </BaseNode>
  );
}

function CropNode({ id, data }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data}>
      <Handle id="image_url" type="target" position={Position.Left} />
      <Handle id="output" type="source" position={Position.Right} />
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
        {(["xPercent", "yPercent", "widthPercent", "heightPercent"] as const).map((key) => (
          <input
            key={key}
            className="rounded bg-zinc-800 p-1"
            value={String(data[key] ?? "")}
            onChange={(event) => updateNodeData(id, { [key]: event.target.value })}
          />
        ))}
      </div>
    </BaseNode>
  );
}

function ExtractNode({ id, data }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data}>
      <Handle id="video_url" type="target" position={Position.Left} style={{ top: 36 }} />
      <Handle id="timestamp" type="target" position={Position.Left} style={{ top: 72 }} />
      <Handle id="output" type="source" position={Position.Right} />
      <input
        className="mt-2 w-full rounded bg-zinc-800 p-2 text-xs"
        value={String(data.timestamp ?? "0")}
        onChange={(event) => updateNodeData(id, { timestamp: event.target.value })}
      />
    </BaseNode>
  );
}

const nodeTypes = {
  text: TextNode,
  upload_image: (props: NodeProps<Node<EditorNodeData>>) => (
    <UploadNode {...props} accept="jpg,jpeg,png,webp,gif" />
  ),
  upload_video: (props: NodeProps<Node<EditorNodeData>>) => (
    <UploadNode {...props} accept="mp4,mov,webm,m4v" />
  ),
  llm: LlmNode,
  crop_image: CropNode,
  extract_frame: ExtractNode,
};

export function FlowEditor() {
  const { nodes, edges, setNodes, setEdges, addNode, selectedNodeIds, setSelectedNodeIds } = useFlowStore();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const nodeCountRef = useRef(0);
  /** Avoid infinite loops: React Flow can fire onSelectionChange every frame with a new array reference. */
  const selectionKeyRef = useRef<string>("");

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes(applyNodeChanges(changes, nodes));
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    setEdges(applyEdgeChanges(changes, edges));
  };

  const onConnect = (connection: Connection) => {
    const edgeId = `e-${connection.source}-${connection.target}-${edges.length + 1}`;
    setEdges(
      addEdge(
        {
          ...connection,
          id: edgeId,
          animated: true,
          style: { stroke: "#7c3aed", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
        },
        edges,
      ),
    );
  };

  const isValidConnection = (connection: Connection | Edge) => {
    const source = nodes.find((n) => n.id === connection.source);
    const target = nodes.find((n) => n.id === connection.target);
    if (!source || !target) return false;

    const sourceType = source.type;
    const targetHandle = connection.targetHandle ?? "";
    if (targetHandle === "images" || targetHandle === "image_url") {
      return sourceType === "upload_image" || sourceType === "crop_image" || sourceType === "extract_frame";
    }
    if (targetHandle === "video_url") {
      return sourceType === "upload_video";
    }
    return true;
  };

  const addTemplateNode = (label: string, type: string) => {
    nodeCountRef.current += 1;
    const newNode: Node = {
      id: `${type}-${nodeCountRef.current}`,
      position: { x: 200 + (nodeCountRef.current % 3) * 240, y: 120 + (nodeCountRef.current % 4) * 120 },
      data: { label },
      type,
    };
    addNode(newNode);
  };

  const totalNodes = useMemo(() => nodes.length, [nodes.length]);

  const toWorkflowPayload = (): WorkflowInput => ({
      name: "Product Marketing Kit Generator",
      nodes: nodes.map((node) => ({
        id: node.id,
        type: (node.type as WorkflowInput["nodes"][number]["type"]) ?? "text",
        label: String((node.data as { label?: string })?.label ?? "Node"),
        data: (node.data as Record<string, unknown>) ?? {},
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      })),
    });

  const saveWorkflow = async () => {
    const payload = toWorkflowPayload();

    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const runWorkflow = async (mode: "full" | "selected" | "single") => {
    const runResponse = await fetch("/api/workflows/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        nodeIds: mode === "full" ? undefined : selectedNodeIds,
        workflow: toWorkflowPayload(),
      }),
    });
    const runJson = (await runResponse.json()) as { run?: Record<string, unknown> };
    if (runJson.run) {
      setRuns((current) => [runJson.run as Record<string, unknown>, ...current].slice(0, 20));
    }
  };

  const onDragStartTemplate = (event: React.DragEvent<HTMLButtonElement>, label: string) => {
    event.dataTransfer.setData("application/nextflow-node", label);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOverCanvas = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDropCanvas = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!flowInstance) return;
    const label = event.dataTransfer.getData("application/nextflow-node");
    if (!label) return;

    const position = flowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    nodeCountRef.current += 1;
    const newNode: Node = {
      id: `${label}-${nodeCountRef.current}`,
      position,
      data: { label },
      type: "text",
    };
    addNode(newNode);
  };

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const ids = selectedNodes.map((node) => node.id);
      const key = ids.slice().sort().join("\0");
      if (key === selectionKeyRef.current) return;
      selectionKeyRef.current = key;
      setSelectedNodeIds(ids);
    },
    [setSelectedNodeIds],
  );

  return (
    <div className="grid min-h-[85vh] grid-cols-[280px_1fr_320px] gap-3">
      <aside className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">NextFlow Nodes</h2>
        <p className="mt-1 text-sm text-zinc-500">Quick access</p>

        <div className="mt-4 space-y-2">
          {nodeTemplates.map((template) => (
            <button
              type="button"
              key={template.label}
              onClick={() => addTemplateNode(template.label, template.type)}
              draggable
              onDragStart={(event) => onDragStartTemplate(event, template.label)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm transition hover:bg-zinc-50"
            >
              {template.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-zinc-900 p-3 text-sm text-zinc-100">
          <p>Nodes: {totalNodes}</p>
          <p>Edges: {edges.length}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={saveWorkflow}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => runWorkflow("full")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            Run Full
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => runWorkflow("selected")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs">
            Run Selected
          </button>
          <button type="button" onClick={() => runWorkflow("single")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs">
            Run Single
          </button>
        </div>
      </aside>

      <section
        className="h-[85vh] overflow-hidden rounded-xl border border-zinc-200 bg-white"
        onDragOver={onDragOverCanvas}
        onDrop={onDropCanvas}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onInit={setFlowInstance}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </section>
      <aside className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-base font-semibold">Workflow History</h3>
        <p className="mt-1 text-xs text-zinc-500">Recent full / selected / single runs</p>
        <div className="mt-3 space-y-2">
          {runs.length === 0 ? (
            <p className="text-xs text-zinc-500">No runs yet.</p>
          ) : (
            runs.map((run) => (
              <div key={String(run.id)} className="rounded border border-zinc-200 p-2 text-xs">
                <p className="font-medium">{String(run.mode)} run</p>
                <p>Status: {String(run.status)}</p>
                <p>Duration: {String(run.durationMs ?? "-")}ms</p>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
