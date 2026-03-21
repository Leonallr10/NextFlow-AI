import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, runs: [] });
  }

  let runs: unknown[] = [];
  try {
    runs = await (
      prisma as unknown as {
        workflowRun: { findMany: (args: object) => Promise<unknown[]> };
      }
    ).workflowRun.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: {
        nodeRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
    });
  } catch {
    runs = [];
  }

  return NextResponse.json({ ok: true, runs });
}
