'use client'

import { useEffect, useRef, useState } from 'react'

interface SearchResult {
  fullName: string
  url: string
  excerpt: string
  vite: boolean | null
}

const REPO_URL_PATTERN = /github\.com\/[^/\s]+\/[^/\s]+/i

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
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const isRepoUrl = REPO_URL_PATTERN.test(githubUrl)

  useEffect(() => {
    const handler = () => setLoading(false)
    window.addEventListener('trysdk:job-finished', handler)
    return () => window.removeEventListener('trysdk:job-finished', handler)
  }, [])

  function pickResult(result: SearchResult) {
    setGithubUrl(result.url)
    setSearchResults(null)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  async function runSearch() {
    setError('')
    setSearching(true)
    setSearchResults(null)
    setActiveIndex(-1)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(githubUrl.trim())}`)
      const data = await response.json()
      setSearchResults(Array.isArray(data.results) ? data.results : [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchResults?.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => (index + 1) % searchResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => (index <= 0 ? searchResults.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      pickResult(searchResults[activeIndex])
    } else if (event.key === 'Escape') {
      setSearchResults(null)
      setActiveIndex(-1)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isRepoUrl) {
      await runSearch()
      return
    }
    setError('')
    setSearchResults(null)
    setLoading(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: useCase.trim() || undefined, githubUrl }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Something went wrong')
      window.dispatchEvent(new CustomEvent('trysdk:job', { detail: { jobId: data.jobId, assessmentRequested: data.assessmentRequested === true } }))
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
          <input ref={inputRef} id="githubUrl" type="text" required value={githubUrl} onChange={event => { setGithubUrl(event.target.value); if (searchResults) { setSearchResults(null); setActiveIndex(-1) } }} onKeyDown={handleInputKeyDown} placeholder="Paste a GitHub URL — or describe a project to search" autoComplete="off" role="combobox" aria-expanded={Boolean(searchResults?.length)} aria-controls="repo-search-results" className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-[#f0f6fc] outline-none placeholder:text-[#6e7681]" />
        </div>
        <button type="submit" disabled={loading || searching || !githubUrl.trim()} className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-[#238636] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2ea043] disabled:pointer-events-none disabled:opacity-50">
          {loading ? 'Creating preview…' : searching ? 'Searching…' : isRepoUrl || !githubUrl.trim() ? 'Try it' : 'Search'}
        </button>
      </div>

      {searchResults !== null && (
        <div id="repo-search-results" role="listbox" aria-label="Repository search results" className="mt-2 overflow-hidden rounded-md border border-[#30363d] bg-[#161b22]">
          {searchResults.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#8b949e]">No launchable repos found — try different words or paste a GitHub URL.</p>
          ) : (
            searchResults.map((result, index) => (
              <button key={result.url} type="button" role="option" aria-selected={index === activeIndex} onClick={() => pickResult(result)} className={`group flex w-full items-center gap-3 border-b border-[#21262d] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#1c2128] focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#58a6ff] ${index === activeIndex ? 'bg-[#1c2128]' : ''}`}>
                <svg aria-hidden="true" className="shrink-0 text-[#6e7681]" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z" /></svg>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[13px] text-[#58a6ff]">{result.fullName}</span>
                  {result.excerpt && <span className="block truncate text-xs text-[#6e7681]">{result.excerpt}</span>}
                </span>
                {result.vite && <span className="shrink-0 rounded-full border border-[#3fb950]/40 px-2 py-0.5 text-[11px] text-[#3fb950]">vite ✓</span>}
              </button>
            ))
          )}
        </div>
      )}
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
