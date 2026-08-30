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
  },
  {
    url: 'https://github.com/royalbhati/sqltoerdiagram',
    label: 'SQL to ER Diagram',
    category: 'Developer tool',
    mark: 'SQL',
  },
  {
    url: 'https://github.com/Leonxlnx/sakura-realm',
    label: 'Sakura Realm',
    category: 'Creative',
    mark: '桜',
  },
  {
    url: 'https://github.com/TailAdmin/free-react-tailwind-admin-dashboard',
    label: 'TailAdmin Dashboard',
    category: 'Business',
    mark: 'TA',
  },
  {
    url: 'https://github.com/shadcndashboard/shadcndashboard',
    label: 'shadcn Dashboard',
    category: 'Business',
    mark: 'UI',
  },
]

export function InputForm() {
  const router = useRouter()
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 id="example-library-heading" className="text-sm font-medium text-[#f0f6fc]">Try an example</h2>
            <p className="mt-1 text-xs text-[#8b949e]">Verified public Vite projects for the demo.</p>
          </div>
          {selectedDemo && <span className="font-mono text-[10px] uppercase tracking-wide text-[#3fb950]">Ready to launch</span>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {demoRepositories.map((repo, index) => {
            const selected = selectedDemo?.url === repo.url
            return (
              <button
                key={repo.url}
                type="button"
                aria-pressed={selected}
                onClick={() => setGithubUrl(repo.url)}
                className={`group flex min-w-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58a6ff] ${index === demoRepositories.length - 1 ? 'sm:col-span-2' : ''} ${selected ? 'border-[#238636] bg-[#238636]/10' : 'border-[#30363d] bg-transparent hover:border-[#58a6ff]/70 hover:bg-[#161b22]'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-semibold ${selected ? 'border-[#3fb950]/50 bg-[#238636]/20 text-[#3fb950]' : 'border-[#30363d] bg-[#161b22] text-[#58a6ff]'}`}>{selected ? '✓' : repo.mark}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#c9d1d9] group-hover:text-[#f0f6fc]">{repo.label}</span>
                  <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-[#8b949e]">{repo.category}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-[#58a6ff] opacity-0 transition-opacity group-hover:opacity-100">→</span>
              </button>
            )
          })}
        </div>
      </section>
    </form>
  )
}
