# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**trysdk** orchestrates a Daytona sandbox to clone a GitHub repo, run it, screenshot it with Playwright, and use Claude vision to produce a fit report. See `AGENTS.md` for the full pipeline mental model and file responsibilities.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server at localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (add this script if missing)
```

No test runner is configured yet. Unit tests for `lib/detector.ts` and `lib/evaluator.ts` would be the highest-value additions.

## Architecture

The core data flow is:

1. `POST /api/jobs` → creates a job in the in-memory store (`lib/jobs.ts`) and fires an unawaited async pipeline
2. Pipeline steps call `lib/sandbox.ts` helpers (all Daytona SDK calls are centralized there), `lib/detector.ts` for stack detection, and `lib/evaluator.ts` for Claude vision
3. Each step calls `emitStatus()` which appends a `StatusEvent` to a parallel `Map<string, StatusEvent[]>`
4. `GET /api/jobs/[jobId]/stream` is an SSE endpoint that polls the event list every 500ms and closes on `DONE`/`ERROR`
5. `GET /api/jobs/[jobId]/result` returns the final `EvalResult`

`lib/types.ts` is the single source of truth for all TypeScript types. Edit types there first; never redeclare locally.

`scripts/scout.playwright.ts` runs **inside** the Daytona sandbox (not locally). It reads `APP_URL` and `OUTPUT_DIR` from env, visits common routes, and saves `<route-slug>.png` + `routes.json`.

## Daytona SDK notes

Package is `@daytona/sdk` — `import { Daytona } from '@daytona/sdk'`. Key API shapes that differ from what you might expect:
- `executeCommand(cmd)` → returns `{ result: string }`, not `{ stdout, stderr, exitCode }`
- Background processes need sessions: `createSession(name)` + `executeSessionCommand(name, { command, runAsync: true })`
- Git clone: `sandbox.git.clone(url, 'workspace/repo')` — native SDK, not `execCommand('git clone')`
- Preview URL: `sandbox.getPreviewLink(port)` → `{ url, token }` — token must be sent as `x-daytona-preview-token` header (pass it to the scout script as `PREVIEW_TOKEN` env var)
- File I/O: `sandbox.fs.uploadFile(Buffer.from(str), path)` / `sandbox.fs.downloadFile(path)` → Buffer

## Key constraints

- `lib/evaluator.ts` is intentionally stubbed with mock data — keep `// TODO:` markers until real Claude vision is wired
- All Daytona SDK calls must go through `lib/sandbox.ts`; never import `@daytona/sdk` directly in route files
- `sandbox.delete()` must always run in a `finally` block
- The POST route handler must return `{ jobId }` immediately — never `await` the background pipeline
- SSE route must stay on Node.js runtime (`maxDuration = 300`); do not set `runtime = 'edge'`
- No database — the in-memory `Map` in `lib/jobs.ts` is intentional

## Environment variables

```
ANTHROPIC_API_KEY=
DAYTONA_API_KEY=
DAYTONA_API_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
