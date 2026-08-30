'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const demoRepositories = [
  {
    url: 'https://github.com/dgreenheck/threejs-procedural-planets',
    label: 'Procedural Planets',
    category: 'Creative',
    description: 'Interactive 3D planets — the primary demo.',
  },
  {
    url: 'https://github.com/royalbhati/sqltoerdiagram',
    label: 'SQL to ER Diagram',
    category: 'Developer tool',
    description: 'Turn SQL schemas into entity relationship diagrams.',
  },
  {
    url: 'https://github.com/Leonxlnx/sakura-realm',
    label: 'Sakura Realm',
    category: 'Creative',
    description: 'A polished visual experience and reliable backup.',
  },
  {
    url: 'https://github.com/TailAdmin/free-react-tailwind-admin-dashboard',
    label: 'TailAdmin Dashboard',
    category: 'Business',
    description: 'A production-style admin dashboard with rich UI.',
  },
  {
    url: 'https://github.com/shadcndashboard/shadcndashboard',
    label: 'shadcn Dashboard',
    category: 'Business',
    description: 'A heavier dashboard example built with shadcn/ui.',
  },
]

export function InputForm() {
  const router = useRouter()
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasUrl = githubUrl.trim().length > 0
  const isGithubUrl = /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/i.test(githubUrl.trim())
  const selectedDemoUrl = demoRepositories.some(repo => repo.url === githubUrl) ? githubUrl : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The current backend contract retains useCase while the preview-first UI does not expose it.
        body: JSON.stringify({ useCase: 'Launch this repository as a temporary preview.', githubUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      router.push(`/results/${data.jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-3">
      <label className="text-sm font-medium text-[#f0f6fc]" htmlFor="githubUrl">
        GitHub repository URL
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="githubUrl"
          type="url"
          placeholder="https://github.com/owner/repository"
          value={githubUrl}
          onChange={e => setGithubUrl(e.target.value)}
          required
          aria-describedby="github-url-help"
          className={`h-11 border bg-[#0d1117] text-[#f0f6fc] placeholder:text-[#6e7681] focus-visible:border-[#58a6ff] focus-visible:ring-[#58a6ff] sm:flex-1 ${isGithubUrl ? 'border-[#238636]' : 'border-[#30363d]'}`}
        />
        <Button
          type="submit"
          disabled={loading || !githubUrl.trim()}
          className="h-11 bg-[#238636] px-5 font-semibold text-white hover:bg-[#2ea043]"
        >
          {loading ? 'Creating preview…' : 'Try it'}
        </Button>
      </div>

      {error && <p className="text-sm text-[#f85149]">{error}</p>}
      <p id="github-url-help" aria-live="polite" className={`text-xs ${isGithubUrl ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>
        {isGithubUrl
          ? 'Public GitHub repository detected. Ready to create a preview.'
          : hasUrl
            ? 'Use the repository URL, for example https://github.com/owner/repository.'
            : 'Public Vite frontend repositories are the most reliable today.'}
      </p>
      <div className="flex flex-col gap-1.5 border-t border-[#21262d] pt-4 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor="demo-repository" className="shrink-0 text-xs font-medium text-[#8b949e]">
          Or choose a demo repository
        </label>
        <select
          id="demo-repository"
          value={selectedDemoUrl}
          onChange={event => setGithubUrl(event.target.value)}
          className="h-8 min-w-0 rounded-md border border-[#30363d] bg-[#161b22] px-2 text-xs text-[#c9d1d9] outline-none transition-colors hover:border-[#8b949e] focus:border-[#58a6ff] sm:flex-1"
        >
          <option value="">Select a prepared repository</option>
          {demoRepositories.map(repo => (
            <option key={repo.url} value={repo.url}>{repo.label} — {repo.category}</option>
          ))}
        </select>
      </div>

      <section aria-labelledby="example-library-heading" className="mt-3 border-t border-[#21262d] pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 id="example-library-heading" className="text-sm font-medium text-[#f0f6fc]">Example library</h2>
            <p className="mt-1 text-xs text-[#8b949e]">Verified public Vite repositories for a quick preview.</p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wide text-[#58a6ff]">{demoRepositories.length} ready</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {demoRepositories.map(repo => (
            <article key={repo.url} className="group rounded-md border border-[#30363d] bg-[#161b22] p-3 transition-colors hover:border-[#58a6ff]/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#f0f6fc]">{repo.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#8b949e]">{repo.description}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#30363d] px-1.5 py-0.5 font-mono text-[10px] text-[#8b949e]">{repo.category}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGithubUrl(repo.url)}
                className="mt-3 border-[#30363d] bg-transparent text-xs text-[#c9d1d9] hover:border-[#58a6ff] hover:bg-[#1f6feb]/10 hover:text-[#f0f6fc]"
              >
                Use example <span aria-hidden="true">→</span>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </form>
  )
}
