# NextFlow AI

NextFlow AI is a node-based workflow web app inspired by Krea-style graph UX.
It uses React Flow for the editor and is scaffolded to integrate Clerk auth,
Trigger.dev background jobs, Prisma persistence, Transloadit file processing,
Zod validation, Zustand state, and FFmpeg worker commands.

## Quick start

1. Install dependencies: `npm install`
2. Copy env: `copy .env.example .env` (or `.env.local`)
3. Fill keys — **`GOOGLE_AI_API_KEY`** for LLM runs (default: direct Gemini in Next.js, fastest). Optional: **`LLM_USE_TRIGGER=true`** + Trigger keys if you want LLM only on Trigger.dev workers.
4. Run dev: `npm run dev`
5. Open `http://localhost:3000` — sign in, then use the **workflow editor on `/dashboard`**.

## Sample workflow

- **In the UI:** open the dashboard editor and click **Load sample workflow (7 nodes)** to restore the *Product Marketing Kit Generator* graph (all six node types + connections).
- **JSON / API:** see `examples/sample-workflow.json` — use as the body for `POST /api/workflows` or as `workflow` inside `POST /api/workflows/run`. The same shape is built in code via `getSampleWorkflowPayload()` in `src/lib/sample-workflow.ts`.
- **Import on dashboard:** click **Import workflow JSON…** in the left sidebar — modal with paste / **Upload .json**, **Validate only**, and **Import to canvas** (`src/lib/workflow-import.ts`: JSON → structure → Zod schema → edge/node id checks).
- **Quick import test files:** `examples/sample-mini-chat.json` (3 nodes: system + user text → LLM) and `examples/sample-image-caption.json` (image URL + prompt → LLM vision).

## LLM node (Gemini + Trigger.dev)

- **Graph:** Incoming edges to an LLM node are resolved per handle: `system_prompt`, `user_message`, `images` (see `src/lib/resolve-llm-inputs.ts`).
- **Execution:** `POST /api/workflows/run` walks the DAG, then for each `llm` node calls `executeLlmViaTriggerOrFallback` (`src/lib/trigger-llm.ts`).
  - **Default (fast):** Gemini runs **directly in the Next.js server** via `GOOGLE_AI_API_KEY` — no Trigger queue/poll delay.
  - **Trigger-only LLM:** set **`LLM_USE_TRIGGER=true`** plus `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL`, and deploy `run-llm-node` with `GOOGLE_AI_API_KEY` on the worker. Uses `tasks.trigger` + `runs.poll` (interval: `LLM_TRIGGER_POLL_MS`, default 400).
- **Model:** Default is **`gemini-2.5-flash`** (`DEFAULT_GEMINI_MODEL` in `src/lib/gemini-defaults.ts`). Older IDs like `gemini-2.0-flash` may 404 for new API keys — pick a current model from [Gemini models](https://ai.google.dev/gemini-api/docs/models).
- **UI:** The API returns `nodeOutputs`; the client updates each LLM node’s `data.output` inline (`src/components/flow-editor.tsx`).

## Implemented features

- React Flow visual editor on **`/dashboard`** (after sign-in)
- Zustand state store for nodes and edges
- Zod schema validation for workflow payloads
- API route: `POST /api/workflows`
- API route: `GET /api/workflows`
- API route: `GET /api/workflows/:id`
- API route: `POST /api/workflows/run` (DAG execution, Gemini LLM via Trigger `run-llm-node` or direct fallback)
- Trigger task: `src/trigger/tasks/run-llm-node.ts` (Gemini); barrel `src/trigger/index.ts`
- API route: `GET /api/media/ffmpeg-command`
- API route: `POST /api/media/transloadit`
- API route: `POST /api/webhooks/transloadit`
- API route: `POST /api/webhooks/trigger`
- Prisma schema for workflows in `prisma/schema.prisma`
- Clerk middleware and provider setup
- Dashboard at `/dashboard` and workflow detail page at `/workflows/:id`
- Auth pages: `/sign-in` and `/sign-up` with production-style layout content
- API route: `GET /api/auth/session` for current session/user snapshot
- API route: `GET /api/dashboard/summary` for protected dashboard counters
- Trigger.dev queue utility in `src/lib/trigger.ts`
- Trigger task modules: `src/trigger/tasks/render-workflow.ts`, `src/trigger/tasks/run-llm-node.ts`
- Transloadit client bootstrap in `src/lib/transloadit.ts`
- Webhook HMAC verification helpers in `src/lib/webhook-security.ts`
- Webhook event persistence model: `WebhookEvent` in `prisma/schema.prisma`

## Reference documentation used

- [React Flow docs](https://reactflow.dev/docs/introduction/)
- [Trigger.dev docs](https://trigger.dev/docs/introduction)
- [Clerk docs](https://clerk.com/docs)
- [Transloadit docs](https://transloadit.com/docs/)
- [Prisma docs](https://www.prisma.io/docs)
- [Zustand docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Zod docs](https://zod.dev/)
- [FFmpeg docs](https://ffmpeg.org/documentation.html)
