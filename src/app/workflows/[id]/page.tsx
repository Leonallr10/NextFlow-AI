import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { WorkflowDeleteButton } from "@/components/workflow-delete-button";
import { WorkflowGraphJsonPanel } from "@/components/workflow-graph-json-panel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkflowDetailsPage({ params }: PageProps) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) {
    return (
      <div className="min-h-full bg-zinc-100 p-6 font-sans [color-scheme:light]">
        <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Unauthorized</h1>
          <Link href="/sign-in" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:text-violet-900">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <div className="min-h-full bg-zinc-100 p-6 font-sans [color-scheme:light]">
        <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Workflow details</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Set DATABASE_URL to enable persisted workflow details.
          </p>
        </div>
      </div>
    );
  }

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (workflow && "userId" in (workflow as unknown as Record<string, unknown>)) {
    const ownerId = (workflow as unknown as Record<string, unknown>).userId;
    if (ownerId && ownerId !== userId) {
      return (
        <div className="min-h-full bg-zinc-100 p-6 font-sans [color-scheme:light]">
          <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-zinc-900">Workflow not found</h1>
            <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:text-violet-900">
              Back to dashboard
            </Link>
          </div>
        </div>
      );
    }
  }

  if (!workflow) {
    return (
      <div className="min-h-full bg-zinc-100 p-6 font-sans [color-scheme:light]">
        <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Workflow not found</h1>
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:text-violet-900">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-100 p-4 font-sans md:p-6 [color-scheme:light]">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{workflow.name}</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">ID: {workflow.id}</p>
          <p className="mt-3 text-sm text-zinc-600">
            Read-only snapshot of the graph JSON stored for this workflow. Edit the canvas on the dashboard and save again
            to update.
          </p>

          <WorkflowGraphJsonPanel graphJson={workflow.graphJson} />

          <WorkflowDeleteButton workflowId={workflow.id} workflowName={workflow.name} />
        </div>
      </div>
    </div>
  );
}
