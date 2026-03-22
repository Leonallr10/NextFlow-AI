"use client";

import { useEffect, useState } from "react";

/** Dispatched after a successful workflow save so client UI can refetch (stats + saved list). */
export const DASHBOARD_REFRESH_EVENT = "nextflow-dashboard-stats-refresh";

export type DashboardStatsBarProps = {
  initialWorkflowCount: number;
  initialWebhookCount: number;
  hasDatabase: boolean;
};

/**
 * Live-updating stats for the dashboard header. Refetches when Save completes
 * (custom event) so counts stay in sync without a full page reload.
 */
export function DashboardStatsBar({
  initialWorkflowCount,
  initialWebhookCount,
  hasDatabase,
}: DashboardStatsBarProps) {
  const [workflowCount, setWorkflowCount] = useState(initialWorkflowCount);
  const [webhookCount, setWebhookCount] = useState(initialWebhookCount);

  useEffect(() => {
    setWorkflowCount(initialWorkflowCount);
    setWebhookCount(initialWebhookCount);
  }, [initialWorkflowCount, initialWebhookCount]);

  useEffect(() => {
    const refresh = () => {
      void fetch("/api/dashboard/summary", { credentials: "include" })
        .then((res) => res.json())
        .then(
          (data: {
            summary?: { workflows: number; webhookEvents: number };
          }) => {
            if (data.summary) {
              setWorkflowCount(data.summary.workflows);
              setWebhookCount(data.summary.webhookEvents);
            }
          },
        )
        .catch(() => {
          /* ignore */
        });
    };

    window.addEventListener(DASHBOARD_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, refresh);
  }, []);

  if (!hasDatabase) {
    return (
      <span className="text-xs text-amber-600">
        DB not configured — run history may be local only
      </span>
    );
  }

  return (
    <span className="text-xs text-zinc-500">
      {workflowCount} workflow(s) · {webhookCount} webhook row(s)
    </span>
  );
}

/** Call from client after a successful save so the stats bar refetches. */
export function notifyDashboardStatsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
  }
}
