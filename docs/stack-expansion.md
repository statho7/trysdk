# Extending Try SDK beyond Vite

Status: roadmap (post-hackathon). Nothing in this document is in scope before the 17:00 submission.

Try SDK is deliberately Vite-first today. This document describes how to widen repository
coverage without giving up the property that makes the product credible: **every supported
stack either launches reliably or fails fast with a clear reason.**

## Why the current design already supports expansion

`lib/detector.ts` returns a *launch plan*, not a framework flag:

```ts
{
  framework, projectRoot, packageManager,
  installCmd,   // e.g. cd <root> && npm ci
  startCmd,     // e.g. cd <root> && npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
  port,         // what getPreviewLink() is called with
}
```

The pipeline (`app/api/jobs/route.ts`) consumes only this shape. Expansion therefore means:
**more detectors producing the same shape**, plus one universal fallback. No pipeline changes.

Package-manager handling (npm / pnpm / yarn via lockfile, monorepo walk-up) is already
framework-agnostic and is reused by every tier below.

---

## Tier 1 — Adapter table (days, covers most frontend repos)

Each framework becomes a small adapter: *how to recognise it, how to start it, which port it uses*.

| Framework | Detection signal | Start command | Port | Notes |
| --- | --- | --- | --- | --- |
| Static HTML | no `package.json`, root `index.html` | `npx serve -l 5173 .` | 5173 | ~20 lines; unlocks the long tail (portfolios, CSS demos, single-file games) |
| Next.js | `next` in deps / `next.config.*` | `next dev -p 3000 -H 0.0.0.0` | 3000 | flags differ from Vite (`-p`/`-H`); no host-check issues in dev |
| SvelteKit | `vite dev` script | *already matched* by the `\bvite\b` regex | 5173 | verify with one example repo |
| Astro | `astro` in deps | `astro dev --host 0.0.0.0 --port 5173` | 5173 | Vite-based; flags supported natively |
| Nuxt 3 | `nuxt` in deps | `nuxt dev --host 0.0.0.0 --port 5173` | 5173 | Vite-based by default |
| Remix / React Router 7 | `@remix-run/*` or `react-router` dev script | `react-router dev --host 0.0.0.0 --port 5173` | 5173 | Vite-based |
| Generic Node server | `start`/`dev` script, none of the above | `npm run start` + port discovery (Tier 2) | discovered | Express, Fastify, Hono demos |

Rules for every adapter:

1. **One verified example repo** cold-tested from a fresh sandbox before the adapter ships.
   No adapter is "supported" without a repo in the examples library proving it.
2. Adapters that cannot pin a port must use `--strictPort`-equivalent behaviour or Tier 2
   port discovery — never "hope it's on the default port".

## Tier 2 — Port discovery (the universal unlock)

Hardcoded ports are the real whitelist. Replace the assumption with discovery:

1. Run the repo's own `dev` / `start` script unmodified.
2. Discover the listening port inside the sandbox:
   - poll `ss -tlnp` until a new listener appears, and/or
   - parse dev-server stdout for `https?://localhost:(\d+)`.
3. Call `getPreviewLink(discoveredPort)`.

For servers that bind `127.0.0.1` only (common default), run a tiny TCP relay inside the
sandbox (`socat TCP-LISTEN:5173,fork TCP:127.0.0.1:$PORT`, or a 15-line Node proxy) so the
preview domain can reach it regardless of the server's bind address.

This flips the model from "frameworks we listed" to **"any Node project whose dev script
binds a port"** — one mechanism instead of N adapters. Adapters remain as fast paths with
known-good flags; discovery is the fallback.

## Tier 3 — New runtimes (weeks)

- **Python (Streamlit, Gradio, FastAPI, Flask).** Detection is easy
  (`requirements.txt` / `pyproject.toml` + entry-point heuristics); the work is the image.
  The current `node:22` image has no Python. Build a custom Daytona snapshot with
  node + python + `uv` preinstalled. Streamlit and Gradio are the demo-worthy targets —
  they are how data-science repos want to be tried.
- **Multi-runtime image + warm npm cache.** The same snapshot work can pre-warm `~/.npm`
  for the examples library (measured: cold `npm ci` 2m16s → warm 15s).
- **Docker / docker-compose.** Requires Docker-in-Docker, which sandboxes do not reliably
  provide. Out of scope; fail with an honest "compose projects aren't supported yet".

## Tier 4 — Preflight compatibility check (the trust feature)

Before creating a sandbox, classify the repo and tell the user what will happen:

- **Supported** — matches a verified adapter → launch.
- **Likely** — dev script present, no unmet requirements → launch with a caveat badge.
- **Needs secrets** — `.env.example` / `process.env.X` without defaults / database URLs
  detected → fail fast: *"This repo needs `DATABASE_URL`. Try SDK runs self-contained
  frontends."* Seconds, not a 5-minute timeout.
- **Unsupported** — compose-only, native toolchains, no entry point → say so immediately.

Half of expansion is not running more repos — it is failing clearly on the ones we can't.
This check is also the natural seam for the future validation-report agent.

## Sequencing

1. Static HTML fallback (lowest risk, biggest long-tail coverage)
2. Next.js adapter + one verified example
3. Port discovery + bind relay (retires per-framework port logic)
4. Astro / Nuxt / Remix adapters (mostly config rows by then)
5. Preflight compatibility check
6. Python runtime snapshot (Streamlit first)

Each step keeps the invariant: **a stack is either verified-supported or fails fast with a
reason.** That invariant is the product.
