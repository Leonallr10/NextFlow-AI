import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100 p-4 font-sans md:p-6 items-center justify-center">
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 items-center justify-center ">
        <header className="rounded-xl border border-zinc-200 bg-white p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">NextFlow AI Studio</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Sign in to open the workflow builder (nodes, canvas, and run history).
                The editor is available on the dashboard after authentication.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
                href="/sign-in"
              >
                Log in
              </Link>
              <Link
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100"
                href="/sign-up"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        {/* <section className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-700">Workflow editor</p>
          <p className="mt-2">
            Log in or create an account — you will be redirected to the dashboard where the
            full flow editor (nodes, React Flow canvas, workflow history) is shown.
          </p>
        </section> */}
      </main>
    </div>
  );
}
