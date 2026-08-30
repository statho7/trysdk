# Build Plan

Phased implementation order — each phase produces something runnable.

---

## Phase 1 — Scaffold & types

**Goal:** A working Next.js project with all files created but most logic stubbed.

1. `npx create-next-app@latest trysdk --typescript --tailwind --app --no-src-dir`
2. Install dependencies:
   ```bash
   npm install @anthropic-ai/sdk @daytonaio/sdk
   npm install -D @types/node
   npx shadcn@latest init
   npx shadcn@latest add button input textarea card badge
   ```
3. Create `.env.example` with all four keys
4. Create every file in the project structure with its full skeleton — empty functions with correct signatures and return type annotations
5. Write `lib/types.ts` in full — this is the schema that everything else depends on

**Checkpoint:** `npm run build` passes with no type errors (stubs return typed mock values).

---

## Phase 2 — Core lib layer

**Goal:** All `lib/` files implemented and unit-testable in isolation.

### 2a. `lib/jobs.ts`

```ts
// Two maps:
const jobs = new Map<string, Job>()
const events = new Map<string, StatusEvent[]>()

export function createJob(githubUrl, useCase): Job
export function getJob(jobId): Job | undefined
export function updateJob(jobId, patch: Partial<Job>): void
export function emitStatus(jobId, status, message): void
export function getEvents(jobId): StatusEvent[]
```

`emitStatus` must also call `updateJob` to keep `job.status` in sync.

### 2b. `lib/detector.ts`

Pure function — no SDK calls, fully unit-testable.

```ts
export function detectStack(fileList: string[]): {
  installCmd: string
  startCmd: string
  port: number
  language: string
}
```

Test by passing mock file lists for each supported stack.

### 2c. `lib/sandbox.ts`

Install: `npm install @daytona/sdk`

Wire up real Daytona SDK calls. Start with `createSandbox` and `execCommand` — these unblock everything else.

```ts
import { Daytona } from '@daytona/sdk'
const daytona = new Daytona() // reads DAYTONA_API_KEY from env automatically

export async function createSandbox(jobId: string): Promise<Sandbox>
  // await daytona.create() — default allows outbound network

export async function execCommand(sandbox, cmd): Promise<{ result: string }>
  // await sandbox.process.executeCommand(cmd)
  // returns { result: string } — not stdout/stderr/exitCode

export async function startBackground(sandbox, sessionName, cmd): Promise<void>
  // await sandbox.process.createSession(sessionName)
  // await sandbox.process.executeSessionCommand(sessionName, { command: cmd, runAsync: true })

export async function cloneRepo(sandbox, githubUrl): Promise<void>
  // await sandbox.git.clone(githubUrl, 'workspace/repo')
  // do NOT use execCommand('git clone ...') — use the native SDK method

export async function uploadFile(sandbox, content: string, remotePath): Promise<void>
  // await sandbox.fs.uploadFile(Buffer.from(content), remotePath)

export async function downloadFile(sandbox, remotePath): Promise<Buffer>
  // await sandbox.fs.downloadFile(remotePath)

export async function getPreviewUrl(sandbox, port): Promise<{ url: string, token: string }>
  // await sandbox.getPreviewLink(port)
  // returns { url, token } — token must be passed as x-daytona-preview-token header

export async function deleteSandbox(sandbox): Promise<void>
  // await sandbox.delete()
```

### 2d. `lib/evaluator.ts`

Keep the stub. Add `// TODO: replace with real Claude vision calls` on each call site. Return a realistic `EvalResult` so the frontend can render it end-to-end before Claude is wired.

**Checkpoint:** Can call `detectStack(["package.json"])` and get a result. Sandbox functions compile and export correctly.

---

## Phase 3 — API routes

**Goal:** Full pipeline runs; browser can track a job from create to done.

### 3a. `POST /api/jobs`

```ts
// 1. Validate body
// 2. createJob()
// 3. Fire unawaited pipeline — the runPipeline(job) call
// 4. Return { jobId }
```

Implement `runPipeline(job)` as a module-level async function (not inside the route handler):

```
emitStatus(CLONING)
createSandbox()
cloneRepo(sandbox, githubUrl)            ← sandbox.git.clone() native method
emitStatus(INSTALLING)
execCommand: list files → detectStack()
execCommand: installCmd
emitStatus(RUNNING)
startBackground(sandbox, 'app', startCmd) ← session + runAsync:true
const { url, token } = await getPreviewUrl(sandbox, port)
updateJob({ previewUrl: url })            ← store token too if Playwright needs it
emitStatus(READY)
uploadFile: scout.playwright.ts           // TODO: wire up in Phase 5
execCommand: install playwright           // TODO: stub this
execCommand: run scout                    // TODO: stub this
emitStatus(ANALYZING)
downloadFile: screenshots                 // TODO: stub this
evaluateScreenshots()
updateJob({ result })
emitStatus(DONE)
```

### 3b. `GET /api/jobs/[jobId]/stream`

```ts
export const maxDuration = 300

// ReadableStream that:
// - gets current events from getEvents(jobId)
// - tracks lastIndex
// - every 500ms: flush new events as SSE data frames
// - closes when status === DONE || ERROR
```

### 3c. `GET /api/jobs/[jobId]/result`

```ts
const job = getJob(jobId)
if (!job || !job.result) return Response.json(null, { status: 404 })
return Response.json(job.result)
```

**Checkpoint:** `curl -X POST /api/jobs -d '{"useCase":"...","githubUrl":"..."}'` returns `{ jobId }`. SSE stream opens and receives status events. Result endpoint returns mock EvalResult after DONE.

---

## Phase 4 — Frontend

**Goal:** Full user journey in the browser.

### 4a. `app/page.tsx` + `components/InputForm.tsx`

- Dark landing page with headline, subtext, two inputs, submit button
- On submit: POST → redirect to `/results/${jobId}`

### 4b. `components/StatusFeed.tsx`

- Reads a `StatusEvent[]` prop
- Renders a vertical timeline: icon + label + message + timestamp
- Current step: pulsing animation
- Completed steps: green checkmark
- ERROR: red

### 4c. `components/FitReport.tsx`

- Accepts `EvalResult` prop
- Large fit score with color coding: 0–4 red, 5–7 amber, 8–10 green
- Feature grid: ✅/❌ per feature, hover shows notes
- Screenshot gallery: thumbnail grid, click to expand
- Verdict banner
- Caveats list

### 4d. `app/results/[jobId]/page.tsx`

```tsx
'use client'
// On mount: new EventSource('/api/jobs/${jobId}/stream')
// Accumulate events → pass to StatusFeed
// On READY event: show previewUrl link
// On DONE event: close EventSource, fetch /api/jobs/${jobId}/result
// Render StatusFeed until result, then render FitReport
```

**Checkpoint:** Full user journey works end-to-end with the stubbed evaluator. Status feed animates live. FitReport renders mock data correctly.

---

## Phase 5 — Real Playwright execution

**Goal:** Screenshots actually come from the running app.

1. Write `scripts/scout.playwright.ts` fully:
   - Read `APP_URL` and `OUTPUT_DIR` from env
   - Visit each route, skip 404s
   - Save `.png` files and `routes.json`

2. In the pipeline (`api/jobs/route.ts`), replace the TODO stubs:
   ```ts
   await uploadFile(sandbox, scoutScriptContent, '/workspace/scout.ts')
   await execCommand(sandbox, 'npm install -g tsx playwright && npx playwright install chromium')
   // APP_URL is the preview URL; Playwright must send x-daytona-preview-token header with each request
   await execCommand(sandbox, `APP_URL=${previewUrl} PREVIEW_TOKEN=${token} OUTPUT_DIR=/tmp/shots tsx /workspace/scout.ts`)
   const routesJson = await downloadFile(sandbox, '/tmp/shots/routes.json')
   // download each png listed in routesJson
   ```

   Note: the scout script must set the `x-daytona-preview-token` header on every Playwright request. Do this via `page.setExtraHTTPHeaders({ 'x-daytona-preview-token': process.env.PREVIEW_TOKEN })` before navigation.

**Checkpoint:** Real screenshots arrive from a live sandbox and are passed to the (still-stubbed) evaluator.

---

## Phase 6 — Real Claude vision

**Goal:** Evaluator makes real Anthropic API calls.

Replace the stub in `lib/evaluator.ts`:

1. Per-screenshot call:
```ts
anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot.base64 } },
      { type: 'text', text: `Use case: ${useCase}\nRoute: ${screenshot.route}\nWhat features are visible? Does it support this use case? Reply as JSON: { features: [...], notes: string }` }
    ]
  }]
})
```

2. Aggregation call: sends all per-screenshot notes as text, requests final `EvalResult` JSON.

**Checkpoint:** Real fit reports generated from live screenshots.

---

## Phase 7 — Polish & deploy

1. Error states: show helpful messages for clone failures, unknown stacks, sandbox timeouts
2. Loading skeletons on the results page
3. Mobile-responsive layout
4. `vercel env pull .env.local` to sync Vercel env vars
5. `vercel deploy` — zero extra config needed
6. Smoke test against a known repo (e.g. `https://github.com/vercel/next.js/tree/canary/examples/blog-starter`)

---

## Stubbing strategy

At every phase, stubs should:
- Return **typed values** that match the real return type
- Be marked with `// TODO:` and a one-line description of what's missing
- Use realistic mock data (not empty arrays or zeros) so the UI renders meaningfully

This lets the frontend and backend be developed and tested independently.
