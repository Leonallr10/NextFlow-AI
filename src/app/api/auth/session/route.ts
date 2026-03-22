import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { serverLog } from "@/lib/server-log";

export async function GET() {
  const { userId, sessionId } = await auth();

  if (!userId) {
    serverLog("api/auth/session", { event: "unauthenticated" });
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
      },
      { status: 401 },
    );
  }

  const user = await currentUser();
  serverLog("api/auth/session", {
    event: "authenticated",
    userId,
    sessionId: sessionId ?? null,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });

  return NextResponse.json({
    ok: true,
    authenticated: true,
    sessionId,
    user: {
      id: user?.id ?? userId,
      email: user?.emailAddresses?.[0]?.emailAddress ?? null,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      imageUrl: user?.imageUrl ?? null,
    },
  });
}
