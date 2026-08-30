'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function InputForm() {
  const router = useRouter()
  const [useCase, setUseCase] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase, githubUrl }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xl">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-zinc-400" htmlFor="useCase">
          What are you building?
        </label>
        <Textarea
          id="useCase"
          placeholder="e.g. A multi-tenant SaaS with Stripe billing, RBAC, and a React dashboard"
          value={useCase}
          onChange={e => setUseCase(e.target.value)}
          required
          rows={3}
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 resize-none focus-visible:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-zinc-400" htmlFor="githubUrl">
          GitHub repository URL
        </label>
        <Input
          id="githubUrl"
          type="url"
          placeholder="https://github.com/owner/repo"
          value={githubUrl}
          onChange={e => setGithubUrl(e.target.value)}
          required
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !useCase.trim() || !githubUrl.trim()}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
      >
        {loading ? 'Starting…' : 'Scout it →'}
      </Button>
    </form>
  )
}
