"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-defaults";
import { LlmOutputMarkdown } from "@/components/llm-output";
import { notifyDashboardStatsRefresh } from "@/components/dashboard-stats-bar";
import { WorkflowImportModal } from "@/components/workflow-import-modal";
import { suggestedNodeImportCounter } from "@/lib/workflow-import";

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
  selected,
  children,
  className,
}: {
  id: string;
  data: EditorNodeData;
  /** Mirrors React Flow selection — violet ring + border when true. */
  selected?: boolean;
  children?: React.ReactNode;
  /** Extra classes on the card (e.g. wider LLM node). */
  className?: string;
}) {
  const removeNode = useFlowStore((s) => s.removeNode);
  const selectionClass = selected
    ? "border-violet-500 ring-2 ring-violet-400/70 shadow-[0_0_24px_-6px_rgba(139,92,246,0.45)]"
    : "border-zinc-700 ring-0 ring-transparent";
  return (
    <div
      className={`min-w-[220px] rounded-lg border bg-zinc-900 p-3 text-zinc-100 shadow-xl transition-[border-color,box-shadow,ring-width] duration-150 ease-out ${selectionClass} ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{id}</p>
          <p className="mt-1 text-sm font-medium">{data.label}</p>
        </div>
        <button
          type="button"
          title="Delete node"
          aria-label={`Delete node ${id}`}
          className="shrink-0 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:border-red-500 hover:bg-red-950/80 hover:text-red-200"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            removeNode(id);
          }}
        >
          Delete
        </button>
      </div>
      {children}
    </div>
  );
}

function TextNode({ id, data, selected }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data} selected={selected}>
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

function UploadNode({
  id,
  data,
  selected,
  accept,
  inputHandleId,
}: NodeProps<Node<EditorNodeData>> & { accept: string; inputHandleId?: string }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data} selected={selected}>
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

function LlmNode({ id, data, selected }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data} selected={selected} className="min-w-[300px] max-w-[min(100vw,26rem)]">
      <Handle id="system_prompt" type="target" position={Position.Left} style={{ top: 30 }} />
      <Handle id="user_message" type="target" position={Position.Left} style={{ top: 58 }} />
      <Handle id="images" type="target" position={Position.Left} style={{ top: 86 }} />
      <Handle id="output" type="source" position={Position.Right} />
      <label className="mt-2 block text-left">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Model
        </span>
        <input
          className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-left text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          autoComplete="off"
          spellCheck={false}
          value={String(data.model ?? DEFAULT_GEMINI_MODEL)}
          onChange={(event) => updateNodeData(id, { model: event.target.value })}
        />
      </label>
      <div className="mt-3 text-left">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Output
        </span>
        <div className="max-h-72 min-h-[3rem] overflow-x-auto overflow-y-auto rounded-md border border-zinc-600 bg-zinc-950/90 px-3 py-2.5 shadow-inner">
          <LlmOutputMarkdown text={String(data.output ?? "")} />
        </div>
      </div>
    </BaseNode>
  );
}

function CropNode({ id, data, selected }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data} selected={selected}>
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

function ExtractNode({ id, data, selected }: NodeProps<Node<EditorNodeData>>) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode id={id} data={data} selected={selected}>
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
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    selectedNodeIds,
    setSelectedNodeIds,
    updateNodeData,
    loadSampleWorkflow,
    loadFromWorkflowInput,
    workflowName,
    setWorkflowName,
  } = useFlowStore();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const nodeCountRef = useRef(0);
  /** Avoid infinite loops: React Flow can fire onSelectionChange every frame with a new array reference. */
  const selectionKeyRef = useRef<string>("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importBanner, setImportBanner] = useState<string | null>(null);

  const onNodesChange = (changes: NodeChange[]) => {
    // Always read the latest graph from the store so rapid updates (e.g. select + dimensions)
    // are not applied on a stale `nodes` closure — that drops `selected` and breaks Run Selected.
    const { nodes: currentNodes, edges: currentEdges } = useFlowStore.getState();
    const nextNodes = applyNodeChanges(changes, currentNodes);
    const selectedIds = nextNodes.filter((n) => n.selected).map((n) => n.id);
    const key = selectedIds.slice().sort().join("\0");
    if (key !== selectionKeyRef.current) {
      selectionKeyRef.current = key;
      setSelectedNodeIds(selectedIds);
    }
    const ids = new Set(nextNodes.map((n) => n.id));
    const nextEdges = currentEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
    setNodes(nextNodes);
    if (nextEdges.length !== currentEdges.length) {
      setEdges(nextEdges);
    }
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
    const data: Record<string, unknown> = { label };
    if (type === "llm") {
      data.model = DEFAULT_GEMINI_MODEL;
      data.output = "";
    }
    const newNode: Node = {
      id: `${type}-${nodeCountRef.current}`,
      position: { x: 200 + (nodeCountRef.current % 3) * 240, y: 120 + (nodeCountRef.current % 4) * 120 },
      data,
      type,
    };
    addNode(newNode);
  };

  const totalNodes = useMemo(() => nodes.length, [nodes.length]);

  const handleWorkflowImported = useCallback(
    (workflow: WorkflowInput) => {
      loadFromWorkflowInput(workflow);
      const nextNodes = useFlowStore.getState().nodes;
      nodeCountRef.current = Math.max(nodeCountRef.current, suggestedNodeImportCounter(nextNodes));
      setImportBanner(
        `Imported "${workflow.name}" (${workflow.nodes.length} nodes, ${workflow.edges.length} edges).`,
      );
      window.setTimeout(() => setImportBanner(null), 8000);
      window.requestAnimationFrame(() => {
        flowInstance?.fitView({ padding: 0.2 });
      });
    },
    [loadFromWorkflowInput, flowInstance],
  );

  const toWorkflowPayload = (): WorkflowInput => ({
      name: workflowName.trim(),
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
    setSaveMessage(null);
    setSaveError(null);
    const trimmedName = workflowName.trim();
    if (trimmedName.length < 2) {
      setSaveError("Enter a project name (at least 2 characters) in the sidebar.");
      return;
    }
    const payload = toWorkflowPayload();
    console.log("[NextFlow] Save workflow → POST /api/workflows", {
      name: payload.name,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      nodeTypes: payload.nodes.map((n) => n.type),
    });

    setIsSaving(true);
    let res: Response;
    try {
      res = await fetch("/api/workflows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      setIsSaving(false);
      setSaveError(e instanceof Error ? e.message : "Network error while saving.");
      return;
    }
    setIsSaving(false);

    const json = (await res.json()) as { ok?: boolean; error?: string; warning?: string; workflow?: { id?: string } };
    console.log("[NextFlow] Save workflow ← response", { ok: res.ok, status: res.status, body: json });

    if (!res.ok) {
      setSaveError(typeof json.error === "string" ? json.error : `Save failed (${res.status})`);
      return;
    }

    const persistedToDb = !json.warning;
    setWorkflowName(trimmedName);
    setSaveMessage(
      persistedToDb
        ? "Workflow saved to your account."
        : "Workflow validated (set DATABASE_URL to persist to the database).",
    );
    notifyDashboardStatsRefresh();
    router.refresh();

    window.setTimeout(() => setSaveMessage(null), 6000);
  };

  const runWorkflow = async (mode: "full" | "selected" | "single") => {
    setRunError(null);
    if (workflowName.trim().length < 2) {
      setRunError("Enter a project name (at least 2 characters) in the sidebar before running.");
      return;
    }
    if (mode !== "full" && selectedNodeIds.length === 0) {
      setRunError("Select one or more nodes on the canvas first (Run Selected / Run Single).");
      return;
    }
    if (mode === "single" && selectedNodeIds.length !== 1) {
      setRunError("Run Single: select exactly one node on the canvas, then click again.");
      return;
    }

    const body = {
      mode,
      nodeIds: mode === "full" ? undefined : selectedNodeIds,
      workflow: toWorkflowPayload(),
    };
    console.log("[NextFlow] Run workflow → POST /api/workflows/run", {
      mode,
      selectedNodeIds: body.nodeIds,
      workflowName: body.workflow.name,
      nodeCount: body.workflow.nodes.length,
    });

    setIsRunning(true);
    let runResponse: Response;
    try {
      runResponse = await fetch("/api/workflows/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Network error while running workflow.");
      return;
    } finally {
      setIsRunning(false);
    }

    const runJson = (await runResponse.json()) as {
      ok?: boolean;
      error?: string;
      run?: Record<string, unknown>;
      nodeOutputs?: Record<string, unknown>;
    };
    console.log("[NextFlow] Run workflow ← response", {
      ok: runResponse.ok,
      status: runResponse.status,
      run: runJson.run,
      nodeOutputs: runJson.nodeOutputs,
    });

    if (!runResponse.ok) {
      setRunError(typeof runJson.error === "string" ? runJson.error : `Run failed (${runResponse.status})`);
      return;
    }

    if (runJson.nodeOutputs) {
      const storeNodes = useFlowStore.getState().nodes;
      for (const [nodeId, out] of Object.entries(runJson.nodeOutputs)) {
        const n = storeNodes.find((x) => x.id === nodeId);
        if (n?.type === "llm" && typeof out === "string") {
          updateNodeData(nodeId, { output: out });
        }
      }
    }

    if (runJson.run) {
      setRuns((current) => [runJson.run as Record<string, unknown>, ...current].slice(0, 20));
    }

    const runRecord = runJson.run as
      | { status?: string; nodeRuns?: Array<{ status?: string; error?: string; nodeId?: string }> }
      | undefined;
    if (runRecord?.status === "failed" && Array.isArray(runRecord.nodeRuns)) {
      const failed = runRecord.nodeRuns.find((nr) => nr.status === "failed");
      if (failed?.error) {
        setRunError(
          failed.nodeId
            ? `${failed.nodeId}: ${failed.error}`
            : failed.error,
        );
      }
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

  return (
    <>
    <div className="grid min-h-[85vh] grid-cols-[280px_1fr_320px] gap-3 text-zinc-900">
      <aside className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 [color-scheme:light]">
        <h2 className="text-lg font-semibold">NextFlow Nodes</h2>
        <p className="mt-1 text-sm text-zinc-500">Quick access</p>

        <label className="mt-4 block" htmlFor="nextflow-project-name">
          <span className="text-xs font-medium text-zinc-700">Project name</span>
          <input
            id="nextflow-project-name"
            type="text"
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="e.g. Summer launch campaign"
            maxLength={120}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p className="mt-2 text-[11px] leading-snug text-zinc-500">
          Used when you <strong>Save</strong> or <strong>Run</strong>; appears in Saved workflows.
        </p>

        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="mt-4 w-full rounded-lg border border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-900 shadow-sm transition hover:bg-violet-100"
        >
          Import workflow JSON…
        </button>
        {importBanner ? (
          <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs text-emerald-900" role="status">
            {importBanner}
          </p>
        ) : null}

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
        <button
          type="button"
          onClick={() => loadSampleWorkflow()}
          className="mt-3 w-full rounded-lg border border-dashed border-zinc-400 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Load sample workflow (7 nodes)
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={saveWorkflow}
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => runWorkflow("full")}
            disabled={isRunning}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? "Running…" : "Run Full"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => runWorkflow("selected")}
            disabled={isRunning}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run Selected
          </button>
          <button
            type="button"
            onClick={() => runWorkflow("single")}
            disabled={isRunning}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run Single
          </button>
        </div>
        {saveMessage ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs text-emerald-900" role="status">
            {saveMessage}
          </p>
        ) : null}
        {saveError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-800" role="alert">
            {saveError}
          </p>
        ) : null}
        {runError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-800" role="alert">
            {runError}
          </p>
        ) : null}
      </aside>

      <section
        className="h-[100vh] overflow-hidden rounded-xl border border-zinc-200 bg-white"
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
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </section>
      <aside className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 [color-scheme:light]">
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
    <WorkflowImportModal
      open={importModalOpen}
      onClose={() => setImportModalOpen(false)}
      onImported={handleWorkflowImported}
    />
    </>
  );
}
