import { logger, task } from "@trigger.dev/sdk";

export const renderWorkflow = task({
  id: "render-workflow",
  run: async (payload: { workflowId: string }) => {
    logger.info("Running render-workflow task", payload);
    return {
      ok: true,
      workflowId: payload.workflowId,
      completedAt: new Date().toISOString(),
    };
  },
});
