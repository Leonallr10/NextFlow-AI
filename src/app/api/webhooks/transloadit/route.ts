import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHmacSha384 } from "@/lib/webhook-security";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.TRANSLOADIT_WEBHOOK_SECRET ?? process.env.TRANSLOADIT_SECRET ?? "";
  const signature =
    request.headers.get("transloadit-signature") ??
    request.headers.get("x-transloadit-signature");
  const signatureValid = secret ? verifyHmacSha384(rawBody, secret, signature) : true;

  if (secret && !signatureValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid Transloadit webhook signature" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as { ok?: string; assembly_id?: string };
  const eventType = payload?.ok ? "assembly.completed" : "assembly.event";

  if (process.env.DATABASE_URL) {
    await prisma.webhookEvent.create({
      data: {
        provider: "transloadit",
        eventType,
        signatureValid,
        payload: payload as object,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    provider: "transloadit",
    received: true,
    event: eventType,
    assemblyId: payload?.assembly_id ?? null,
    signatureValid,
  });
}
