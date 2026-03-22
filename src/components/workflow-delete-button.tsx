"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyDashboardStatsRefresh } from "@/components/dashboard-stats-bar";

type WorkflowDeleteButtonProps = {
  workflowId: string;
  workflowName: string;
};

/**
 * Destructive delete for the workflow detail page; redirects to the dashboard on success.
 */
export function WorkflowDeleteButton({ workflowId, workflowName }: WorkflowDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    if (
      !window.confirm(
        `Delete workflow "${workflowName}"? Runs stay in history but lose this link. This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(typeof data.error === "string" ? data.error : `Delete failed (${res.status})`);
        return;
      }
      notifyDashboardStatsRefresh();
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-6 border-t border-zinc-200 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Danger zone</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onDelete()}
        className="mt-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete this workflow"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
