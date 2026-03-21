import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkflowDetailsPage({ params }: PageProps) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <Link href="/sign-in" className="mt-3 inline-block text-blue-600">
          Sign in
        </Link>
      </div>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Workflow details</h1>
        <p className="mt-2 text-zinc-600">
          Set DATABASE_URL to enable persisted workflow details.
        </p>
      </div>
    );
  }

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (workflow && "userId" in (workflow as unknown as Record<string, unknown>)) {
    const ownerId = (workflow as unknown as Record<string, unknown>).userId;
    if (ownerId && ownerId !== userId) {
      return (
        <div className="mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold">Workflow not found</h1>
          <Link href="/dashboard" className="mt-3 inline-block text-blue-600">
            Back to dashboard
          </Link>
        </div>
      );
    }
  }

  if (!workflow) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Workflow not found</h1>
        <Link href="/dashboard" className="mt-3 inline-block text-blue-600">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">{workflow.name}</h1>
      <p className="mt-1 text-xs text-zinc-500">ID: {workflow.id}</p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs">
        {JSON.stringify(workflow.graphJson, null, 2)}
      </pre>
    </div>
  );
}
