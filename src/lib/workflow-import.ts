import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { ZodError } from "zod";
import type { WorkflowInput } from "@/lib/workflow-schema";
import { workflowSchema } from "@/lib/workflow-schema";

const defaultEdgeProps = {
  animated: true,
  style: { stroke: "#7c3aed", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
} as const;

export type WorkflowImportFailure = {
  stage: "empty" | "json" | "shape" | "schema" | "graph";
  summary: string;
  issues: string[];
};

function normalizeNodePosition(raw: unknown): { x: number; y: number } {
  if (!raw || typeof raw !== "object") {
    return { x: 0, y: 0 };
  }
  const p = raw as Record<string, unknown>;
  const x = typeof p.x === "number" ? p.x : typeof p.x === "string" ? Number(p.x) : NaN;
  const y = typeof p.y === "number" ? p.y : typeof p.y === "string" ? Number(p.y) : NaN;
  if (Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y };
  }
  return { x: 0, y: 0 };
}

/** Coerce common JSON quirks before Zod (string coords, missing name, etc.). */
function normalizeWorkflowImport(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  let name = typeof o.name === "string" ? o.name.trim() : "";
  if (name.length < 2) {
    name = "Imported workflow";
  }
  const nodeList = Array.isArray(o.nodes) ? o.nodes : [];
  const nodes = nodeList.map((node) => {
    if (!node || typeof node !== "object") return node;
    const n = node as Record<string, unknown>;
    const position = normalizeNodePosition(n.position);
    return { ...n, position };
  });
  return { ...o, name, nodes };
}

function assertWorkflowObjectShape(raw: unknown): { ok: true } | { ok: false; failure: WorkflowImportFailure } {
  if (raw === null || typeof raw !== "object") {
    return {
      ok: false,
      failure: {
        stage: "shape",
        summary: "Root value must be a JSON object.",
        issues: ['Expected an object like { "name": "...", "nodes": [...], "edges": [...] }.'],
      },
    };
  }
  if (Array.isArray(raw)) {
    return {
      ok: false,
      failure: {
        stage: "shape",
        summary: "Root must be an object, not an array.",
        issues: ["Remove the outer [ ] — the file should start with { ."],
      },
    };
  }
  const o = raw as Record<string, unknown>;
  const issues: string[] = [];
  if (!("nodes" in o)) {
    issues.push('Missing required key "nodes" (array of node objects).');
  } else if (!Array.isArray(o.nodes)) {
    issues.push('"nodes" must be an array.');
  }
  if (!("edges" in o)) {
    issues.push('Missing required key "edges" (array of edge objects).');
  } else if (!Array.isArray(o.edges)) {
    issues.push('"edges" must be an array.');
  }
  if (issues.length) {
    return {
      ok: false,
      failure: {
        stage: "shape",
        summary: "Workflow JSON structure is incomplete.",
        issues,
      },
    };
  }
  return { ok: true };
}

function zodIssuesToLines(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map((p) => String(p)).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function validateGraphReferences(workflow: WorkflowInput): string[] {
  const ids = new Set(workflow.nodes.map((n) => n.id));
  const issues: string[] = [];
  for (const e of workflow.edges) {
    if (!ids.has(e.source)) {
      issues.push(`Edge "${e.id}": source "${e.source}" is not a node id in this workflow.`);
    }
    if (!ids.has(e.target)) {
      issues.push(`Edge "${e.id}": target "${e.target}" is not a node id in this workflow.`);
    }
  }
  return issues;
}

/**
 * Full validation pipeline: empty → JSON parse → shape → Zod schema → edge/node id graph checks.
 */
export function validateWorkflowImportText(
  text: string,
): { ok: true; workflow: WorkflowInput } | { ok: false; failure: WorkflowImportFailure } {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      failure: {
        stage: "empty",
        summary: "No JSON to import.",
        issues: ["Paste workflow JSON in the box or upload a .json file."],
      },
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed) as unknown;
  } catch (e) {
    return {
      ok: false,
      failure: {
        stage: "json",
        summary: "Invalid JSON syntax.",
        issues: [e instanceof Error ? e.message : "Could not parse JSON."],
      },
    };
  }

  const shape = assertWorkflowObjectShape(raw);
  if (!shape.ok) {
    return { ok: false, failure: shape.failure };
  }

  const normalized = normalizeWorkflowImport(raw);
  const parsed = workflowSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      ok: false,
      failure: {
        stage: "schema",
        summary: "Workflow does not match the required schema.",
        issues: zodIssuesToLines(parsed.error),
      },
    };
  }

  const graphIssues = validateGraphReferences(parsed.data);
  if (graphIssues.length) {
    return {
      ok: false,
      failure: {
        stage: "graph",
        summary: "Edges reference nodes that are not defined.",
        issues: graphIssues,
      },
    };
  }

  return { ok: true, workflow: parsed.data };
}

export function parseWorkflowJson(
  raw: unknown,
): { ok: true; workflow: WorkflowInput } | { ok: false; error: string } {
  const shape = assertWorkflowObjectShape(raw);
  if (!shape.ok) {
    return { ok: false, error: `${shape.failure.summary} ${shape.failure.issues.join(" ")}`.trim() };
  }
  const normalized = normalizeWorkflowImport(raw);
  const parsed = workflowSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      ok: false,
      error: zodIssuesToLines(parsed.error).join("; ") || parsed.error.message,
    };
  }
  const graphIssues = validateGraphReferences(parsed.data);
  if (graphIssues.length) {
    return { ok: false, error: graphIssues.join("; ") };
  }
  return { ok: true, workflow: parsed.data };
}

export function parseWorkflowJsonString(
  text: string,
): { ok: true; workflow: WorkflowInput } | { ok: false; error: string } {
  const result = validateWorkflowImportText(text);
  if (!result.ok) {
    const extra = result.failure.issues.length ? ` ${result.failure.issues.join("; ")}` : "";
    return { ok: false, error: `${result.failure.summary}${extra}`.trim() };
  }
  return { ok: true, workflow: result.workflow };
}

/** Map validated API/workflow payload to React Flow nodes and edges. */
export function workflowToReactFlow(workflow: WorkflowInput): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      label: n.label,
      ...(n.data ?? {}),
    },
  }));

  const edges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    ...defaultEdgeProps,
  }));

  return { nodes, edges };
}

/** Bump template node counter so new nodes don’t collide with imported ids. */
export function suggestedNodeImportCounter(nodes: Node[]): number {
  let max = 0;
  for (const n of nodes) {
    const parts = n.id.split(/[-_\s]/);
    for (const part of parts) {
      const num = Number.parseInt(part, 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
  }
  return max;
}
