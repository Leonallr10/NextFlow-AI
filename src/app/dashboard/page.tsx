import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { FlowEditor } from "@/components/flow-editor";
import { DashboardStatsBar } from "@/components/dashboard-stats-bar";
import { DashboardSessionLogger } from "@/components/dashboard-session-logger";
import { SavedWorkflowsSection } from "@/components/saved-workflows-section";
import { serverLog } from "@/lib/server-log";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-zinc-600">You must sign in to access this dashboard.</p>
        <Link href="/sign-in" className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white">
          Go to sign in
        </Link>
      </div>
    );
  }

  const user = await currentUser();
  serverLog("dashboard", {
    event: "page_render",
    userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });

  let workflowCount = 0;
  let webhookEventCount = 0;
  let workflows: { id: string; name: string; updatedAt: Date }[] = [];

  if (process.env.DATABASE_URL) {
    try {
      workflows = await prisma.workflow.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
    } catch {
      const all = await prisma.workflow.findMany({
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      workflows = all.filter((workflow) => {
        const maybeOwner = (workflow as unknown as Record<string, unknown>).userId;
        return !maybeOwner || maybeOwner === userId;
      });
    }
    workflowCount = workflows.length;
    webhookEventCount = await prisma.webhookEvent.count();
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100 p-4 font-sans md:p-6">
      <DashboardSessionLogger />
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Workflow Dashboard</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Build and run LLM workflows.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DashboardStatsBar
                hasDatabase={Boolean(process.env.DATABASE_URL)}
                initialWorkflowCount={workflowCount}
                initialWebhookCount={webhookEventCount}
              />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <FlowEditor />

        {process.env.DATABASE_URL ? (
          <SavedWorkflowsSection
            hasDatabase
            initialWorkflows={workflows.map((w) => ({
              id: w.id,
              name: w.name,
              updatedAt: w.updatedAt.toISOString(),
            }))}
          />
        ) : null}
      </main>
    </div>
  );
}
