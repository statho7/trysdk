'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StatusFeed } from '@/components/StatusFeed'
import { FitReport } from '@/components/FitReport'
import type { StatusEvent, EvalResult } from '@/lib/types'

export default function ResultsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  const [events, setEvents] = useState<StatusEvent[]>([])
  const [result, setResult] = useState<EvalResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [destroying, setDestroying] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/jobs/${jobId}/stream`)
    esRef.current = es

    es.onmessage = async (e) => {
      const event: StatusEvent = JSON.parse(e.data)
      setEvents(prev => [...prev, event])

      if (event.status === 'READY') {
        // Fetch the preview URL from the job (embedded in READY message or via a job endpoint)
        // The previewUrl is in the message as "App is live at <url>"
        const match = event.message.match(/https?:\/\/\S+/)
        if (match) setPreviewUrl(match[0])
      }

      if (event.status === 'DONE') {
        es.close()
        setDone(true)
        try {
          const res = await fetch(`/api/jobs/${jobId}/result`)
          if (res.ok) setResult(await res.json())
        } catch {
          // result fetch failed — show what we have
        }
      }

      if (event.status === 'ERROR' || event.status === 'UNSUPPORTED' || event.status === 'DESTROYED') {
        es.close()
        setDone(true)
      }
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [jobId])

  async function copyPreviewLink() {
    if (!previewUrl) return
    try {
      await navigator.clipboard.writeText(previewUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function destroySandbox() {
    setDestroying(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/destroy`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to destroy sandbox')
      setPreviewUrl(null)
    } finally {
      setDestroying(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-8 text-[#f0f6fc] sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#21262d] pb-4">
          <Link href="/" className="text-sm font-medium text-[#8b949e] transition-colors hover:text-[#f0f6fc]">
            ← New preview
          </Link>
          {previewUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyPreviewLink}
                className="rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#c9d1d9] transition-colors hover:border-[#8b949e] hover:bg-[#30363d]"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-[#238636] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2ea043]"
              >
                Open preview
              </a>
              <button
                type="button"
                onClick={destroySandbox}
                disabled={destroying}
                className="rounded-md border border-[#f85149]/60 px-3 py-1.5 text-xs font-medium text-[#f85149] transition-colors hover:bg-[#da3633]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {destroying ? 'Destroying…' : 'Destroy'}
              </button>
            </div>
          )}
        </header>

        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#58a6ff]">Sandbox job</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#f0f6fc]">{done ? 'Preview run complete' : 'Launching your preview'}</h1>
          <p className="mt-1 text-sm text-[#8b949e]">Job {jobId}</p>
        </div>

        {!result ? (
          <StatusFeed events={events} />
        ) : (
          <FitReport result={result} />
        )}
      </div>
    </main>
  )
}
