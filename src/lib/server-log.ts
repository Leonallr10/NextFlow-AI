/**
 * Structured logs for the Node/Next.js terminal (server).
 * Search for `[NextFlow]` in dev server output.
 */
export function serverLog(scope: string, payload: Record<string, unknown>) {
  const line = `[NextFlow][${scope}] ${JSON.stringify(payload)}`;
  console.log(line);
}
