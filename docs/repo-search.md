# Repo search in the launch input (Parallel API)

Status: shipped (`app/api/search/route.ts` + dropdown in `components/InputForm.tsx`).
Requires `PARALLEL_API_KEY` in the environment; the feature hides itself when unset.
Note: the live API's mode values are `fast` / `one-shot` / `agentic` (we use `fast`).

## The idea

Users who don't have a repository URL can type what they want into the **same input**:

```
┌──────────────────────────────────────────────────────┬──────────┐
│ ⌕ 3d planet generator                                │  Search  │
└──────────────────────────────────────────────────────┴──────────┘
   ├─ dgreenheck/threejs-procedural-planets   vite ✓   ─┐
   ├─ jsulpis/planet-generator                vite ✓    │ dropdown
   └─ ...                                               ─┘
```

Picking a result fills the input with the repository URL. The user then presses **Try it**
as usual. One input, two intents, zero mode switches.

## UX rules (what keeps it easy)

1. **One input, automatic intent detection.** Text matching
   `github.com/{owner}/{repo}` → launch flow (unchanged). Anything else → search intent.
   The primary button label morphs between `Try it` and `Search`.
2. **Search on Enter, not per keystroke.** Latency stays predictable, cost stays trivial
   (Search API is ~$5 per 1k requests), and the input never feels janky.
3. **Selecting a result never auto-launches.** It fills the input with the URL so the user
   sees exactly what will run and presses Try it themselves. No surprise sandboxes.
4. **Max 5 results**, keyboard-navigable (↑ ↓ Enter, Esc closes), GitHub command-palette
   styling.
5. **Graceful degradation.** If `PARALLEL_API_KEY` is unset or the API errors, the
   dropdown simply never appears and the placeholder stays URL-only. Search can never
   break the demo path.
6. **Honest empty state.** "No launchable repos found — try different words or paste a
   GitHub URL."

## Implementation sketch

### API route — `app/api/search/route.ts`

```ts
// POST https://api.parallel.ai/v1beta/search
// headers: x-api-key: PARALLEL_API_KEY, parallel-beta: search-extract-2025-10-10
{
  objective: `Find public GitHub repositories that are self-contained frontend
    projects built with Vite matching: "${query}". Prefer repository root pages.`,
  search_queries: [`${query} vite github`, `${query} demo repository`],
  mode: "basic",                        // ~1s; "turbo" ~200ms if quality holds
  source_policy: { include_domains: ["github.com"] },
  max_results: 10,
  excerpts: { max_chars_per_result: 300 }
}
```

Post-process before returning to the client:

- keep only URLs matching `^https://github\.com/[^/]+/[^/]+/?$` (strip `/tree/...`,
  `/issues`, `/blob/...` to the repo root, then dedupe);
- return `{ fullName, url, excerpt }`, capped at 5.

### Compatibility badge (stretch, +15 min)

After rendering the dropdown, probe each result asynchronously:
`raw.githubusercontent.com/{owner}/{repo}/HEAD/package.json` → if `"vite"` appears in
deps/scripts, show a `vite ✓` badge. Badges appear progressively; rows without the badge
still work (the launch pipeline is the real arbiter and fails with its normal message).

### Frontend

- Debounced input state; intent regex; dropdown component reusing the examples-list row
  styling (owner in muted mono, repo name in accent).
- No new pages, no state store changes — the result of a search is just text in the
  existing input.

## Why Parallel instead of the GitHub search REST API

- Semantic matching: "dashboard for my shop" finds ecommerce admin templates GitHub's
  literal keyword search misses.
- Sponsor integration is worth points at this hackathon, and the objective string lets us
  bias results toward *launchable* (Vite, self-contained) repos — GitHub search cannot.
- Fallback consideration: if Parallel key/credits are unavailable on the day, the same
  route shape can be backed by `GET api.github.com/search/repositories` — the frontend
  doesn't change.

## Demo beat (if shipped)

> "And if you don't have a repo in mind — just describe what you want."
> Type the **rehearsed** query, pick the top result, Try it.

Never search a novel query live on stage. Rehearse the exact string, verify the top
result launches, and script it.

## Risks

| Risk | Mitigation |
| --- | --- |
| Result is a subpage / blog-like URL | strict repo-root regex + dedupe |
| Top result isn't launchable | vite ✓ badge probe; pipeline fails fast with its normal error |
| API latency spike on stage | `basic` mode, rehearsed query, search is not on the critical demo path |
| Key missing / credits exhausted | feature auto-hides; URL flow unaffected |
