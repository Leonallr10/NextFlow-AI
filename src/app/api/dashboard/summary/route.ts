import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: true,
      summary: {
        workflows: 0,
        webhookEvents: 0,
      },
      warning: "DATABASE_URL not set",
    });
  }

  const [workflows, webhookEvents] = await Promise.all([
    prisma.workflow.count(),
    prisma.webhookEvent.count(),
  ]);

  return NextResponse.json({
    ok: true,
    summary: { workflows, webhookEvents },
  });
}
