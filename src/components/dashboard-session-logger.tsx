"use client";

import { useEffect } from "react";

/**
 * Calls GET /api/auth/session once on dashboard load so:
 * - Browser console shows the session payload
 * - Terminal (Next server) logs via serverLog in that route
 */
export function DashboardSessionLogger() {
  useEffect(() => {
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        console.log("[NextFlow][dashboard] GET /api/auth/session →", data);
      })
      .catch((err) => {
        console.warn("[NextFlow][dashboard] session fetch failed", err);
      });
  }, []);

  return null;
}
