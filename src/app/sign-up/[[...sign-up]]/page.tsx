import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2 md:p-8">
        <section className="rounded-xl bg-white p-4 md:p-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">NextFlow</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Create your account</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Start building node-based AI workflows with secure auth, background jobs, and media processing.
            </p>
          </div>
          <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold">What you get</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <p>- Dashboard with workflow history and quick actions</p>
            <p>- API endpoints for save, run, and webhook ingestion</p>
            <p>- Verified webhook pipeline for Trigger.dev and Transloadit</p>
          </div>
          <Link className="mt-5 inline-block text-sm text-zinc-700 underline" href="/sign-in">
            Already have an account? Sign in
          </Link>
        </section>
      </div>
    </div>
  );
}
