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

      if (event.status === 'ERROR') {
        es.close()
        setDone(true)
      }
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [jobId])

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-950 px-6 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← New scout
          </Link>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Open live app ↗
            </a>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Scouting report</h1>
          <p className="text-zinc-500 text-sm mt-1">Job {jobId}</p>
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
