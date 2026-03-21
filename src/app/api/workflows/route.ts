import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { workflowSchema } from "@/lib/workflow-schema";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: true,
      workflows: [],
      warning: "DATABASE_URL is not set. Returning empty list.",
    });
  }

  let workflows: unknown[] = [];
  try {
    workflows = await (prisma.workflow as unknown as { findMany: (args: object) => Promise<unknown[]> }).findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  } catch {
    workflows = await prisma.workflow.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  }

  return NextResponse.json({ ok: true, workflows });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = workflowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: true,
      workflow: parsed.data,
      warning: "DATABASE_URL is not set. Workflow was validated only.",
    });
  }

  let created: unknown;
  const graphJson = JSON.parse(JSON.stringify(parsed.data)) as object;
  try {
    created = await (prisma.workflow as unknown as { create: (args: object) => Promise<unknown> }).create({
      data: {
        userId,
        name: parsed.data.name,
        graphJson,
      },
    });
  } catch {
    created = await prisma.workflow.create({
      data: {
        userId,
        name: parsed.data.name,
        graphJson,
      },
    });
  }

  return NextResponse.json({ ok: true, workflow: created });
}
