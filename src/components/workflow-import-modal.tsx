"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { WorkflowInput } from "@/lib/workflow-schema";
import {
  type WorkflowImportFailure,
  validateWorkflowImportText,
} from "@/lib/workflow-import";

type WorkflowImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after JSON passes all validation checks. */
  onImported: (workflow: WorkflowInput) => void;
};

const stageLabels: Record<WorkflowImportFailure["stage"], string> = {
  empty: "Empty",
  json: "JSON",
  shape: "Structure",
  schema: "Schema",
  graph: "Graph",
};

export function WorkflowImportModal({ open, onClose, onImported }: WorkflowImportModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [failure, setFailure] = useState<WorkflowImportFailure | null>(null);
  const [lastOkCheck, setLastOkCheck] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFailure(null);
    setLastOkCheck(null);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runValidation = useCallback((): WorkflowInput | null => {
    setLastOkCheck(null);
    const result = validateWorkflowImportText(text);
    if (!result.ok) {
      setFailure(result.failure);
      return null;
    }
    setFailure(null);
    setLastOkCheck(`Valid: "${result.workflow.name}" — ${result.workflow.nodes.length} nodes, ${result.workflow.edges.length} edges.`);
    return result.workflow;
  }, [text]);

  const handleValidateOnly = () => {
    runValidation();
  };

  const handleImport = () => {
    const workflow = runValidation();
    if (!workflow) return;
    onImported(workflow);
    setText("");
    setFailure(null);
    setLastOkCheck(null);
    onClose();
  };

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type && !file.type.includes("json")) {
      setFailure({
        stage: "shape",
        summary: "Please choose a .json file.",
        issues: [`Selected file: "${file.name}"`],
      });
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setText(content);
      setFailure(null);
      setLastOkCheck(null);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-zinc-900/60 p-4 pt-12 backdrop-blur-[2px] [color-scheme:light]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close import dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[101] w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              Import workflow JSON
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-zinc-600">
              Same format as <code className="rounded bg-zinc-100 px-1 text-xs">POST /api/workflows</code>: required{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">nodes</code> and{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">edges</code> arrays;{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">name</code> (≥2 chars) or it defaults to{" "}
              <em>Imported workflow</em>. Example: <code className="rounded bg-zinc-100 px-1 text-xs">examples/sample-workflow.json</code>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>

        <label htmlFor="workflow-import-json" className="mt-4 block text-xs font-medium text-zinc-700">
          JSON
        </label>
        <textarea
          ref={textareaRef}
          id="workflow-import-json"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFailure(null);
            setLastOkCheck(null);
          }}
          placeholder='{ "name": "My flow", "nodes": [...], "edges": [...] }'
          spellCheck={false}
          rows={12}
          className="mt-1.5 w-full resize-y rounded-xl border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Upload .json file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onFileSelected}
          />
          <button
            type="button"
            onClick={handleValidateOnly}
            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
          >
            Validate only
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800"
          >
            Import to canvas
          </button>
        </div>

        {failure ? (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold text-red-900">
              <span className="mr-2 rounded bg-red-200/80 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-900">
                {stageLabels[failure.stage]}
              </span>
              {failure.summary}
            </p>
            {failure.issues.length > 0 ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-red-900">
                {failure.issues.map((line) => (
                  <li key={line} className="break-words">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {lastOkCheck && !failure ? (
          <p
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            {lastOkCheck}
          </p>
        ) : null}
      </div>
    </div>
  );
}
