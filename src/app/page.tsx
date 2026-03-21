import Link from "next/link";
import { FlowEditor } from "@/components/flow-editor";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-100 p-4 font-sans md:p-6">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">NextFlow AI Studio</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Node-based AI editor inspired by Krea. React Flow powers graph
                UX, while Clerk, Trigger.dev, Prisma, Transloadit, FFmpeg,
                Zod, and Zustand are prepared for auth, jobs, storage, and
                validation.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                href="/sign-in"
              >
                Sign in
              </Link>
              <Link
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white"
                href="/sign-up"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>
        <FlowEditor />
      </main>
    </div>
  );
}
