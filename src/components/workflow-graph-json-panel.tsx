"use client";

import { useCallback, useState } from "react";

type WorkflowGraphJsonPanelProps = {
  graphJson: unknown;
};

/**
 * Readable JSON view for workflow detail page (explicit light-theme text; optional copy).
 */
export function WorkflowGraphJsonPanel({ graphJson }: WorkflowGraphJsonPanelProps) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(graphJson, null, 2);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
        <h2 className="text-sm font-semibold text-zinc-800">Graph JSON</h2>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <pre
        className="mt-3 max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left text-xs leading-relaxed text-zinc-900 shadow-inner [font-family:var(--font-geist-mono),ui-monospace,monospace]"
        tabIndex={0}
      >
        {text}
      </pre>
    </div>
  );
}
