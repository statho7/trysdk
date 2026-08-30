import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ParallelResult {
  url: string
  title?: string
  excerpts?: string[]
}

export interface SearchResult {
  fullName: string
  url: string
  excerpt: string
  stack: 'vite' | 'astro' | 'static' | null
}

const REPO_PATH = /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/
const NOT_OWNERS = new Set(['topics', 'collections', 'orgs', 'search', 'trending', 'sponsors', 'marketplace', 'features', 'apps', 'settings', 'about', 'contact', 'pricing', 'site', 'blog'])

function toRepoRoot(rawUrl: string): { fullName: string; url: string } | null {
  const match = REPO_PATH.exec(rawUrl)
  if (!match) return null
  const [, owner, repoRaw] = match
  const repo = repoRaw.replace(/\.git$/, '')
  if (NOT_OWNERS.has(owner.toLowerCase())) return null
  return { fullName: `${owner}/${repo}`, url: `https://github.com/${owner}/${repo}` }
}

async function probeStack(fullName: string): Promise<SearchResult['stack']> {
  try {
    const fetchRaw = async (path: string) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2500)
      try {
        return await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${path}`, { signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }
    }
    const response = await fetchRaw('package.json')
    if (response.ok) {
      const text = await response.text()
      if (/"astro"/.test(text)) return 'astro'
      if (/"vite"/.test(text)) return 'vite'
      return null
    }
    if (response.status !== 404) return null
    const indexResponse = await fetchRaw('index.html')
    return indexResponse.ok ? 'static' : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 200)
  if (!query) return NextResponse.json({ results: [] })

  const apiKey = process.env.PARALLEL_API_KEY
  if (!apiKey) return NextResponse.json({ results: [], disabled: true })

  try {
    const response = await fetch('https://api.parallel.ai/v1beta/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'parallel-beta': 'search-extract-2025-10-10',
      },
      body: JSON.stringify({
        objective: `Find public GitHub repositories matching: "${query}" that are self-contained frontend projects built with Vite, Astro, or plain static HTML. Prefer repository-root demo pages. Exclude Next.js, Nuxt, Docker, databases, and backend-only projects.`,
        search_queries: [`${query} vite github`, `${query} astro github`, `${query} static html github`],
        mode: 'fast',
        source_policy: { include_domains: ['github.com'] },
        max_results: 10,
        excerpts: { max_chars_per_result: 240 },
      }),
    })
    if (!response.ok) return NextResponse.json({ results: [] })

    const data = (await response.json()) as { results?: ParallelResult[] }
    const seen = new Set<string>()
    const repos: { fullName: string; url: string; excerpt: string }[] = []
    for (const result of data.results ?? []) {
      const repo = toRepoRoot(result.url)
      if (!repo || seen.has(repo.url)) continue
      seen.add(repo.url)
      const excerpt = (result.excerpts?.[0] ?? result.title ?? '')
        .replace(/<[^>]+>/g, '')
        .replace(/&#x27;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .replace(/^(\.\.\.\s*)?GitHub - [^:]+:\s*/, '')
        .trim()
        .slice(0, 140)
      repos.push({ ...repo, excerpt })
      if (repos.length >= 5) break
    }

    const probes = await Promise.allSettled(repos.map(repo => probeStack(repo.fullName)))
    const results: SearchResult[] = repos.map((repo, index) => ({
      ...repo,
      stack: probes[index].status === 'fulfilled' ? (probes[index] as PromiseFulfilledResult<SearchResult['stack']>).value : null,
    }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
