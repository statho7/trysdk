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
    mark: '3D',
    description: 'Interactive 3D planets — the primary demo.',
  },
  {
    url: 'https://github.com/royalbhati/sqltoerdiagram',
    label: 'SQL to ER Diagram',
    category: 'Developer tool',
    mark: 'SQL',
    description: 'Turn SQL schemas into entity relationship diagrams.',
  },
  {
    url: 'https://github.com/Leonxlnx/sakura-realm',
    label: 'Sakura Realm',
    category: 'Creative',
    mark: '桜',
    description: 'A polished visual experience and reliable backup.',
  },
  {
    url: 'https://github.com/TailAdmin/free-react-tailwind-admin-dashboard',
    label: 'TailAdmin Dashboard',
    category: 'Business',
    mark: 'TA',
    description: 'A production-style admin dashboard with rich UI.',
  },
  {
    url: 'https://github.com/shadcndashboard/shadcndashboard',
    label: 'shadcn Dashboard',
    category: 'Business',
    mark: 'UI',
    description: 'A heavier dashboard example built with shadcn/ui.',
  },
]

export function InputForm() {
  const router = useRouter()
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const hasUrl = githubUrl.trim().length > 0
  const isGithubUrl = /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/i.test(githubUrl.trim())
  const selectedDemo = demoRepositories.find(repo => repo.url === githubUrl)

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
      <section aria-labelledby="example-library-heading" className="mt-4 border-t border-[#21262d] pt-5">
        <button
          type="button"
          aria-expanded={libraryOpen}
          aria-controls="example-library"
          onClick={() => setLibraryOpen(open => !open)}
          className="group flex w-full items-center justify-between rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 text-left transition-all hover:border-[#58a6ff]/80 hover:bg-[#1f6feb]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58a6ff]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#58a6ff]/40 bg-[#1f6feb]/15 font-mono text-xs font-semibold text-[#58a6ff]">↗</span>
            <span>
              <span id="example-library-heading" className="block text-sm font-medium text-[#f0f6fc]">Browse verified examples</span>
              <span className="mt-0.5 block text-xs text-[#8b949e]">{demoRepositories.length} public Vite projects, ready to preview</span>
            </span>
          </span>
          <span className="flex items-center gap-2 text-xs text-[#8b949e] transition-colors group-hover:text-[#c9d1d9]">
            {selectedDemo ? `Selected: ${selectedDemo.label}` : 'Explore'}
            <span aria-hidden="true" className={`text-base leading-none transition-transform ${libraryOpen ? 'rotate-180' : ''}`}>⌄</span>
          </span>
        </button>

        {libraryOpen && (
          <div id="example-library" className="mt-3 grid gap-2 sm:grid-cols-2">
            {demoRepositories.map(repo => {
              const selected = selectedDemo?.url === repo.url
              return (
                <button
                  key={repo.url}
                  type="button"
                  onClick={() => {
                    setGithubUrl(repo.url)
                    setLibraryOpen(false)
                  }}
                  className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58a6ff] ${selected ? 'border-[#58a6ff] bg-[#1f6feb]/15 shadow-[0_0_0_1px_rgba(88,166,255,0.18)]' : 'border-[#30363d] bg-[#161b22] hover:-translate-y-0.5 hover:border-[#58a6ff]/75 hover:bg-[#1c2128]'}`}
                >
                  <span className="absolute right-0 top-0 h-16 w-16 -translate-y-8 translate-x-8 rounded-full bg-[#58a6ff]/[0.07] transition-transform group-hover:scale-150" />
                  <span className="relative flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#30363d] bg-[#0d1117] font-mono text-[11px] font-semibold text-[#58a6ff]">{repo.mark}</span>
                    <span className="min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[#f0f6fc]">{repo.label}</span>
                        {selected && <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-[#58a6ff]">Selected</span>}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#8b949e]">{repo.description}</span>
                      <span className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-[#8b949e]">
                        {repo.category}<span className="text-[#58a6ff] transition-transform group-hover:translate-x-0.5">Use this example →</span>
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </form>
  )
}
