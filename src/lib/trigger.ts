type TriggerRunResponse = {
  id?: string;
  status?: string;
};

export async function queueWorkflowRun(workflowId: string) {
  const apiUrl = process.env.TRIGGER_API_URL;
  const secretKey = process.env.TRIGGER_SECRET_KEY;

  if (!apiUrl || !secretKey) {
    return {
      provider: "trigger.dev",
      queued: false,
      reason: "TRIGGER_API_URL or TRIGGER_SECRET_KEY missing",
      workflowId,
    };
  }

  const response = await fetch(`${apiUrl}/api/v1/tasks/trigger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      task: "render-workflow",
      payload: { workflowId },
    }),
  });

  if (!response.ok) {
    return {
      provider: "trigger.dev",
      queued: false,
      reason: `Trigger API responded with ${response.status}`,
      workflowId,
    };
  }

  const json = (await response.json()) as TriggerRunResponse;
  return {
    provider: "trigger.dev",
    queued: true,
    runId: json.id ?? null,
    status: json.status ?? "queued",
    workflowId,
  };
}
