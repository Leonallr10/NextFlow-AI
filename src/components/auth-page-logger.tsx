"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

type Props = {
  page: "sign-in" | "sign-up";
};

/**
 * Logs auth-related events to the browser console (DevTools).
 * Server-side auth is logged from dashboard/API routes in the terminal.
 */
export function AuthPageLogger({ page }: Props) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const prevSignedIn = useRef(false);

  useEffect(() => {
    console.log(`[NextFlow][${page}] page mounted`);
  }, [page]);

  useEffect(() => {
    if (!isLoaded) return;
    console.log(`[NextFlow][${page}] Clerk loaded`, {
      isSignedIn,
      userId: userId ?? null,
    });
  }, [isLoaded, isSignedIn, userId, page]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!prevSignedIn.current) {
      prevSignedIn.current = true;
      console.log(`[NextFlow][${page}] session active — redirecting to /dashboard`, {
        userId,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
        username: user?.username ?? null,
      });
    }
  }, [isLoaded, isSignedIn, userId, user, page]);

  return null;
}
