# trysdk

> Scout any OSS app for your use case — paste a GitHub repo URL, describe what you're building, get an AI agent report on whether it fits.

## What it does

1. You describe a use case and paste a GitHub repository URL
2. A Daytona sandbox clones the repo and starts the app
3. A Playwright script runs **inside** the sandbox, capturing screenshots of key routes
4. Claude vision analyzes the screenshots and produces a fit report: score (0–10), per-feature verdict, and a plain-language summary

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| Sandbox | Daytona TypeScript SDK (`@daytona/sdk`) |
| AI | Vercel AI SDK (`ai`), routed through Vercel AI Gateway → `anthropic/claude-sonnet-4.6` |
| Deployment | Vercel (zero extra config) |
| Storage | In-memory `Map` — no database |

## Getting Started

### Prerequisites

- Node.js 20+
- Daytona account + API key ([daytona.io](https://daytona.io))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Install & run

```bash
npm install
vercel link                     # connect to your Vercel project
vercel env pull .env.local      # provisions VERCEL_OIDC_TOKEN for AI Gateway
# add DAYTONA_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `VERCEL_OIDC_TOKEN` | Provisioned automatically by `vercel env pull .env.local` — authenticates AI Gateway calls |
| `DAYTONA_API_KEY` | Daytona API key |
| `DAYTONA_API_URL` | Optional; defaults to `https://app.daytona.io/api` |
| `NEXT_PUBLIC_APP_URL` | Public URL (default: `http://localhost:3000`) |

## Using the app

1. Describe your use case (e.g. "I need multi-tenant SaaS with Stripe billing and role-based access")
2. Paste a public GitHub URL (e.g. `https://github.com/calcom/cal.com`)
3. Click **Scout it →** and watch the live status feed
4. Review the fit report — score, features found, screenshots, verdict

## Project Structure

```
app/
  page.tsx                       # Landing: inputs form
  results/[jobId]/page.tsx       # Live status + final report
  api/
    jobs/route.ts                # POST — create job + kick off pipeline
    jobs/[jobId]/stream/route.ts # GET — SSE status stream
    jobs/[jobId]/result/route.ts # GET — final EvalResult
components/
  InputForm.tsx                  # Landing page form
  StatusFeed.tsx                 # Animated live status timeline
  FitReport.tsx                  # Score, features, screenshots, verdict
lib/
  types.ts                       # All shared TypeScript types
  jobs.ts                        # In-memory job store + event emitter
  sandbox.ts                     # Daytona SDK wrappers
  detector.ts                    # Stack detection from file listing
  evaluator.ts                   # Claude vision calls → EvalResult
scripts/
  scout.playwright.ts            # Runs INSIDE the sandbox; takes screenshots
```

See [docs/architecture.md](docs/architecture.md) for data flow and design decisions.  
See [docs/build-plan.md](docs/build-plan.md) for the phased implementation roadmap.

## Architecture Overview

```
Browser → POST /api/jobs → [background pipeline]
                                  ↓
                           Daytona sandbox
                           git clone + npm install + npm run dev
                                  ↓
                           scout.playwright.ts (inside sandbox)
                           visits /, /login, /dashboard, ...
                           saves .png screenshots
                                  ↓
                           lib/evaluator.ts
                           Claude vision → EvalResult
                                  ↓
Browser ← GET /api/jobs/[id]/stream (SSE) ← status events
Browser ← GET /api/jobs/[id]/result ← EvalResult JSON
```

## Limitations & Caveats

- **In-memory only** — jobs are lost on server restart; not suitable for production multi-instance deployment
- **No auth** — anyone with the job ID can see results
- Sandbox deletion always runs in a `finally` block to avoid orphaned resources
- Daytona sandboxes must have outbound network access (`networkBlockAll: false`)
