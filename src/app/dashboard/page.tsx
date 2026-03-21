import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          You must sign in to access this dashboard.
        </p>
        <Link href="/sign-in" className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white">
          Go to sign in
        </Link>
      </div>
    );
  }

  let workflowCount = 0;
  let webhookEventCount = 0;
  let workflows: { id: string; name: string; updatedAt: Date }[] = [];

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Connected as authenticated user. Configure DATABASE_URL to see saved workflows.
        </p>
      </div>
    );
  }

  workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  workflows = workflows.filter((workflow) => {
    const maybeOwner = (workflow as unknown as Record<string, unknown>).userId;
    return !maybeOwner || maybeOwner === userId;
  });
  workflowCount = workflows.length;
  webhookEventCount = await prisma.webhookEvent.count();

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Dashboard</h1>
          <p className="mt-1 text-zinc-600">
            View your latest workflows, system webhook activity, and run status.
          </p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Total workflows</p>
          <p className="mt-1 text-2xl font-semibold">{workflowCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Webhook events</p>
          <p className="mt-1 text-2xl font-semibold">{webhookEventCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Quick actions</p>
          <div className="mt-2 flex gap-2">
            <Link className="rounded-md border border-zinc-300 px-2 py-1 text-sm" href="/">
              Open editor
            </Link>
            <Link className="rounded-md border border-zinc-300 px-2 py-1 text-sm" href="/sign-in">
              Re-auth
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-zinc-600">{workflows.length} recent workflows</p>

      <div className="mt-5 grid gap-3">
        {workflows.map((workflow) => (
          <Link
            className="rounded-lg border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
            href={`/workflows/${workflow.id}`}
            key={workflow.id}
          >
            <p className="font-medium">{workflow.name}</p>
            <p className="text-xs text-zinc-500">{workflow.updatedAt.toISOString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
