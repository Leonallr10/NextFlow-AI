import { task } from "@trigger.dev/sdk/v3";
import { callGemini, type GeminiCallInput } from "@/lib/gemini";

/**
 * PRD: all Gemini calls run inside Trigger.dev.
 * Deploy this task and set GOOGLE_AI_API_KEY in the Trigger.dev project environment.
 */
export const runLlmNode = task({
  id: "run-llm-node",
  run: async (payload: GeminiCallInput) => {
    return callGemini(payload);
  },
});
