import { NextResponse } from 'next/server'
import { Parallel } from 'parallel-web'

export const runtime = 'nodejs'

export interface SearchResult {
  fullName: string
  url: string
  excerpt: string
  vite: boolean | null
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

interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

async function probeViteApplication(fullName: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const [manifestResponse, htmlResponse] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/package.json`, { signal: controller.signal }),
      fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/index.html`, { signal: controller.signal }),
    ])
    clearTimeout(timer)
    if (!manifestResponse.ok || !htmlResponse.ok) return false
    const manifest = JSON.parse(await manifestResponse.text()) as PackageManifest
    const hasVite = Boolean(
      manifest.dependencies?.vite ||
      manifest.devDependencies?.vite ||
      Object.values(manifest.scripts ?? {}).some(script => /\bvite\b/.test(script))
    )
    const hasLaunchScript = Boolean(manifest.scripts?.dev || manifest.scripts?.start)

    return Boolean(
      hasVite &&
      hasLaunchScript
    )
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 200)
  if (!query) return NextResponse.json({ results: [] })

  const apiKey = process.env.PARALLEL_API_KEY
  if (!apiKey) return NextResponse.json({ results: [], disabled: true })

  try {
    const searchQuery = query.slice(0, 160)
    const parallel = new Parallel({ apiKey, timeout: 10_000, maxRetries: 1 })
    const data = await parallel.search({
      objective: `Find public GitHub repository root pages for self-contained frontend applications built with Vite that match this product goal: "${query}". Exclude libraries, tutorials, issue pages, and non-Vite projects.`,
      search_queries: [
        `${searchQuery} Vite GitHub repository`,
        `${searchQuery} frontend Vite demo`,
      ],
      mode: 'fast',
      max_chars_total: 2_400,
      advanced_settings: {
        max_results: 15,
        source_policy: { include_domains: ['github.com'] },
        excerpt_settings: { max_chars_per_result: 240 },
      },
    })

    const seen = new Set<string>()
    const repos: { fullName: string; url: string; excerpt: string }[] = []
    for (const result of data.results) {
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
      if (repos.length >= 12) break
    }

    const viteChecks = await Promise.all(repos.map(repo => probeViteApplication(repo.fullName)))
    const results: SearchResult[] = repos
      .filter((_, index) => viteChecks[index])
      .slice(0, 5)
      .map(repo => ({ ...repo, vite: true }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
