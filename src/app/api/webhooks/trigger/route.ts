import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHmacSha256 } from "@/lib/webhook-security";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-trigger-signature") ??
    request.headers.get("trigger-signature");
  const secret = process.env.TRIGGER_WEBHOOK_SECRET ?? "";
  const signatureValid = secret ? verifyHmacSha256(rawBody, secret, signature) : true;

  if (secret && !signatureValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid Trigger webhook signature" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as { type?: string };
  const eventType = payload?.type ?? "unknown";

  if (process.env.DATABASE_URL) {
    await prisma.webhookEvent.create({
      data: {
        provider: "trigger.dev",
        eventType,
        signatureValid,
        payload: payload as object,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    provider: "trigger.dev",
    event: eventType,
    signatureValid,
  });
}
