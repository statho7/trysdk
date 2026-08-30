'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function InputForm() {
  const router = useRouter()
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasUrl = githubUrl.trim().length > 0
  const isGithubUrl = /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/i.test(githubUrl.trim())

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
    </form>
  )
}
