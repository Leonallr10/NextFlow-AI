import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2 md:p-8">
        <section className="rounded-xl bg-zinc-900 p-6 text-zinc-100 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">NextFlow</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in to your workspace</h1>
          <p className="mt-3 text-sm text-zinc-300">
            Access your pipelines, workflow history, webhook events, and run logs in one place.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-300">
            <li>- Visual node editor with autosave-ready graph state</li>
            <li>- Trigger.dev run queue and execution tracking</li>
            <li>- Transloadit + FFmpeg media processing workflow</li>
          </ul>
          <Link className="mt-6 inline-block text-sm text-zinc-200 underline" href="/sign-up">
            New here? Create an account
          </Link>
        </section>
        <section className="flex items-center justify-center rounded-xl bg-zinc-50 p-4">
          <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
        </section>
      </div>
    </div>
  );
}
