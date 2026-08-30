'use client'

import { useEffect, useState } from 'react'

const examples = [
  { url: 'https://github.com/dgreenheck/threejs-procedural-planets', owner: 'dgreenheck', repo: 'threejs-procedural-planets', description: '3D · installs in ~8s', color: '#f1e05a' },
  { url: 'https://github.com/royalbhati/sqltoerdiagram', owner: 'royalbhati', repo: 'sqltoerdiagram', description: 'SQL → ER diagrams', color: '#f1e05a' },
  { url: 'https://github.com/TailAdmin/free-react-tailwind-admin-dashboard', owner: 'TailAdmin', repo: 'free-react-tailwind-admin-dashboard', description: 'admin dashboard', color: '#3178c6' },
  { url: 'https://github.com/Leonxlnx/sakura-realm', owner: 'Leonxlnx', repo: 'sakura-realm', description: 'visual world', color: '#f1e05a' },
]

export function InputForm() {
  const [githubUrl, setGithubUrl] = useState('')
  const [useCase, setUseCase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = () => setLoading(false)
    window.addEventListener('trysdk:job-finished', handler)
    return () => window.removeEventListener('trysdk:job-finished', handler)
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: useCase.trim() || 'Launch this repository as a temporary preview.', githubUrl }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Something went wrong')
      window.dispatchEvent(new CustomEvent('trysdk:job', { detail: { jobId: data.jobId } }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to start job')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[35rem]">
      <label className="sr-only" htmlFor="useCase">Optional: what do you want to use this project for?</label>
      <textarea id="useCase" value={useCase} onChange={event => setUseCase(event.target.value)} placeholder="Optional: what are you hoping this project can do?" className="mb-2 min-h-16 w-full rounded-md border border-[#30363d] bg-[#010409] px-3 py-2.5 text-sm text-[#f0f6fc] outline-none placeholder:text-[#6e7681] focus:border-[#58a6ff] focus:ring-3 focus:ring-[#1f6feb]/25" />
      <label className="sr-only" htmlFor="githubUrl">GitHub repository URL</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-[#30363d] bg-[#010409] transition-colors focus-within:border-[#58a6ff] focus-within:ring-3 focus-within:ring-[#1f6feb]/25">
          <svg aria-hidden="true" className="ml-3 shrink-0 text-[#6e7681]" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z" /></svg>
          <input id="githubUrl" type="url" required value={githubUrl} onChange={event => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-[#f0f6fc] outline-none placeholder:text-[#6e7681]" />
        </div>
        <button type="submit" disabled={loading || !githubUrl.trim()} className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-[#238636] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2ea043] disabled:pointer-events-none disabled:opacity-50">
          {loading ? 'Creating preview…' : 'Try it'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[#f85149]">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-[#6e7681]">Works with public Vite projects — React, Vue, Svelte, Solid, and vanilla JS. We explore the running preview, capture screenshots, then compare the visible product to your goal.</p>

      <section aria-labelledby="examples-heading" className="mt-7">
        <h2 id="examples-heading" className="mb-2 text-xs font-semibold text-[#8b949e]">Verified examples</h2>
        <div className="overflow-hidden rounded-md border border-[#30363d] bg-[#161b22]">
          {examples.map(example => (
            <button key={example.url} type="button" onClick={() => setGithubUrl(example.url)} className="group flex w-full items-center gap-3 border-b border-[#21262d] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#1c2128] focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#58a6ff]">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: example.color }} />
              <span className="min-w-0 truncate font-mono text-[13px] text-[#58a6ff]"><span className="text-[#6e7681]">{example.owner}/</span>{example.repo}</span>
              <span className="ml-auto shrink-0 text-xs text-[#6e7681]">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

    </form>
  )
}
