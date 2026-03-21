import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, sessionId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
      },
      { status: 401 },
    );
  }

  const user = await currentUser();

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
