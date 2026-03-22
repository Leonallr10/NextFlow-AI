import { runs, tasks } from "@trigger.dev/sdk/v3";
import type { GeminiCallInput, GeminiCallResult } from "@/lib/gemini";
import { callGemini } from "@/lib/gemini";
import { serverLog } from "@/lib/server-log";

function useTriggerForLlm(): boolean {
  const v = process.env.LLM_USE_TRIGGER?.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * LLM execution strategy (from `/api/workflows/run`):
 *
 * - **Default (fast):** `callGemini` runs in the Next.js process — no Trigger queue/poll delay.
 *   Set `GOOGLE_AI_API_KEY` in `.env`.
 *
 * - **Trigger.dev (PRD-style):** set `LLM_USE_TRIGGER=true` plus `TRIGGER_SECRET_KEY` and `TRIGGER_API_URL`.
 *   Uses `tasks.trigger` + `runs.poll` (tunable via `LLM_TRIGGER_POLL_MS`).
 *
 * `tasks.triggerAndWait()` cannot run from API routes — only inside a task.
 */
export async function executeLlmViaTriggerOrFallback(input: GeminiCallInput): Promise<GeminiCallResult> {
  const hasTriggerCreds = Boolean(process.env.TRIGGER_SECRET_KEY && process.env.TRIGGER_API_URL);
  const triggerPollMs = Number(process.env.LLM_TRIGGER_POLL_MS) || 400;

  if (useTriggerForLlm() && hasTriggerCreds) {
    serverLog("llm", { event: "trigger_path", model: input.model });
    const handle = await tasks.trigger("run-llm-node", input);
    const run = await runs.poll(handle.id, { pollIntervalMs: triggerPollMs });

    if (run.isSuccess && run.output != null) {
      return run.output as GeminiCallResult;
    }

    const runErr = run as unknown as {
      error?: { message?: string } | string;
      status?: string;
    };
    const msg =
      typeof runErr.error === "string"
        ? runErr.error
        : runErr.error?.message ?? `run-llm-node finished with status ${run.status ?? "unknown"}`;
    throw new Error(msg);
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error(
      "Set GOOGLE_AI_API_KEY for fast local LLM, or enable Trigger: LLM_USE_TRIGGER=true with TRIGGER_SECRET_KEY + TRIGGER_API_URL and GOOGLE_AI_API_KEY on the Trigger worker.",
    );
  }

  serverLog("llm", {
    event: "direct_gemini",
    model: input.model,
    reason: useTriggerForLlm() ? "Trigger env incomplete" : "LLM_USE_TRIGGER not set (default = direct)",
  });
  return callGemini(input);
}
