"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_REFRESH_EVENT, notifyDashboardStatsRefresh } from "@/components/dashboard-stats-bar";

export type SavedWorkflowRow = {
  id: string;
  name: string;
  updatedAt: string;
};

type SavedWorkflowsSectionProps = {
  hasDatabase: boolean;
  initialWorkflows: SavedWorkflowRow[];
};

function normalizeWorkflow(raw: unknown): SavedWorkflowRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const name = typeof o.name === "string" ? o.name : null;
  if (!id || !name) return null;
  let updatedAt: string;
  if (typeof o.updatedAt === "string") {
    updatedAt = o.updatedAt;
  } else if (o.updatedAt instanceof Date) {
    updatedAt = o.updatedAt.toISOString();
  } else {
    updatedAt = new Date().toISOString();
  }
  return { id, name, updatedAt };
}

/**
 * Client list so it updates immediately after Save (same custom event as {@link DashboardStatsBar}).
 * Server-rendered props are used for first paint; GET /api/workflows refreshes on event + mount.
 */
export function SavedWorkflowsSection({ hasDatabase, initialWorkflows }: SavedWorkflowsSectionProps) {
  const [workflows, setWorkflows] = useState<SavedWorkflowRow[]>(initialWorkflows);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setWorkflows(initialWorkflows);
  }, [initialWorkflows]);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; workflows?: unknown[] };
      if (!data.ok || !Array.isArray(data.workflows)) return;
      const rows = data.workflows.map(normalizeWorkflow).filter(Boolean) as SavedWorkflowRow[];
      setWorkflows(rows);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!hasDatabase) return;
    void fetchWorkflows();
  }, [hasDatabase, fetchWorkflows]);

  useEffect(() => {
    if (!hasDatabase) return;
    const onRefresh = () => void fetchWorkflows();
    window.addEventListener(DASHBOARD_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, onRefresh);
  }, [hasDatabase, fetchWorkflows]);

  const deleteWorkflow = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
      setDeleteError(null);
      setDeletingId(id);
      try {
        const res = await fetch(`/api/workflows/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setDeleteError(typeof data.error === "string" ? data.error : `Delete failed (${res.status})`);
          return;
        }
        await fetchWorkflows();
        notifyDashboardStatsRefresh();
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [fetchWorkflows],
  );

  if (!hasDatabase) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-800">Saved workflows</h2>
      {workflows.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">
          No workflows saved yet. Click <strong>Save</strong> in the editor above — the list updates here
          right away.
        </p>
      ) : (
        <>
          {deleteError ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {deleteError}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex min-w-0 flex-col rounded-lg border border-zinc-200 bg-white shadow-sm"
              >
                <Link
                  className="min-w-0 flex-1 p-3 text-sm hover:bg-zinc-50"
                  href={`/workflows/${workflow.id}`}
                >
                  <p className="font-medium text-zinc-900">{workflow.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{workflow.updatedAt}</p>
                </Link>
                <div className="flex justify-end border-t border-zinc-100 px-2 py-1.5">
                  <button
                    type="button"
                    disabled={deletingId === workflow.id}
                    onClick={(e) => {
                      e.preventDefault();
                      void deleteWorkflow(workflow.id, workflow.name);
                    }}
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === workflow.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
