import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { serverLog } from "@/lib/server-log";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 400 },
    );
  }

  const { id } = await params;
  let workflow = await prisma.workflow.findUnique({ where: { id } });
  if (workflow && "userId" in (workflow as Record<string, unknown>)) {
    const ownerId = (workflow as Record<string, unknown>).userId;
    if (ownerId && ownerId !== userId) {
      workflow = null;
    }
  }

  if (!workflow) {
    return NextResponse.json({ ok: false, error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, workflow });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const workflow = await prisma.workflow.findUnique({ where: { id } });

  if (!workflow) {
    return NextResponse.json({ ok: false, error: "Workflow not found" }, { status: 404 });
  }

  if ("userId" in (workflow as Record<string, unknown>)) {
    const ownerId = (workflow as Record<string, unknown>).userId;
    if (ownerId && ownerId !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.workflow.delete({ where: { id } });

  serverLog("api/workflows DELETE", { userId, workflowId: id });

  return NextResponse.json({ ok: true });
}
