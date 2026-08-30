'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { EvalResult, JobStatus, StatusEvent } from '@/lib/types'

const FitReport = dynamic(
  () => import('@/components/FitReport').then(module => module.FitReport),
  { loading: () => <p className="text-sm text-[#8b949e]">Loading evaluation report…</p> },
)

const previewSteps: Array<[JobStatus, string]> = [
  ['CREATING_SANDBOX', 'Sandbox created'],
  ['CLONING', 'Repository cloned'],
  ['INSTALLING', 'Dependencies installed'],
  ['RUNNING', 'Starting dev server'],
  ['READY', 'Preview ready'],
]

const evaluationSteps: Array<[JobStatus, string]> = [
  ['ANALYZING', 'Evaluating product fit'],
  ['DONE', 'Evaluation report ready'],
]

function useLiveJob() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [events, setEvents] = useState<StatusEvent[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [assessmentRequested, setAssessmentRequested] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      setEvents([])
      setPreviewUrl(null)
      const detail = (event as CustomEvent<{ jobId: string; assessmentRequested: boolean }>).detail
      setAssessmentRequested(detail.assessmentRequested)
      setJobId(detail.jobId)
    }
    window.addEventListener('trysdk:job', handler)
    return () => window.removeEventListener('trysdk:job', handler)
  }, [])

  useEffect(() => {
    if (!jobId) return
    const stream = new EventSource(`/api/jobs/${jobId}/stream`)
    stream.onmessage = event => {
      const next: StatusEvent = JSON.parse(event.data)
      setEvents(previous => [...previous, next])
      if (next.status === 'READY') {
        const match = next.message.match(/https?:\/\/\S+/)
        if (match) {
          setPreviewUrl(match[0])
          window.dispatchEvent(new CustomEvent('trysdk:preview', { detail: { jobId, previewUrl: match[0] } }))
        }
      }
      if (next.status === 'DONE') {
        window.dispatchEvent(new CustomEvent('trysdk:evaluation-ready', { detail: { jobId } }))
      }
      if (['DONE', 'ERROR', 'UNSUPPORTED', 'DESTROYED'].includes(next.status)) {
        window.dispatchEvent(new CustomEvent('trysdk:job-finished', { detail: { status: next.status } }))
        stream.close()
      }
    }
    stream.onerror = () => stream.close()
    return () => stream.close()
  }, [jobId])

  return { jobId, events, previewUrl, assessmentRequested }
}

export function LiveLaunchPanel() {
  const { jobId, events, assessmentRequested } = useLiveJob()
  const last = events.at(-1)
  const evaluationUnavailable = last?.status === 'DONE' && /evaluation was unavailable/i.test(last.message)
  const steps = assessmentRequested
    ? [...previewSteps, ...(evaluationUnavailable ? [['DONE', 'Assessment unavailable'] as [JobStatus, string]] : evaluationSteps)]
    : [...previewSteps, ['DONE', 'Preview live'] as [JobStatus, string]]
  const currentIndex = last ? steps.findIndex(([status]) => status === last.status) : -1

  return (
    <aside id="how" className="min-h-[27rem] overflow-hidden rounded-lg border border-[#30363d] bg-[#161b22] shadow-[0_16px_48px_rgba(1,4,9,0.18)]">
      <div className="border-b border-[#21262d] bg-[#1c2128] px-4 py-3 font-mono text-xs text-[#8b949e]">{jobId ? `launch — ${jobId.slice(0, 8)}` : 'launch — ready when you are'}</div>
      <ol className="p-4">
        {steps.map(([status, label], index) => {
          const completed = currentIndex > index || last?.status === 'DONE'
          const active = currentIndex === index && last?.status !== 'DONE'
          const failedAssessment = evaluationUnavailable && status === 'DONE'
          const detail = events.filter(event => event.status === status).at(-1)?.message
          return (
            <li key={status} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
              <div className="flex flex-col items-center">
                <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${failedAssessment ? 'border-[#f85149] bg-[#da3633]/15 text-[#f85149]' : completed ? 'border-[#3fb950] text-[#3fb950]' : active ? 'border-[#58a6ff] text-[#58a6ff]' : 'border-[#30363d] text-[#6e7681]'}`}>{failedAssessment ? '×' : completed ? '✓' : active ? '◌' : '•'}</span>
                {index < steps.length - 1 && <span className={`min-h-6 w-px flex-1 ${completed ? 'bg-[#3fb950]/40' : 'bg-[#21262d]'}`} />}
              </div>
              <div className="min-w-0 pb-4">
                <p className={`text-sm font-semibold ${failedAssessment ? 'text-[#f85149]' : active ? 'text-[#f0f6fc]' : 'text-[#c9d1d9]'}`}>{label}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-[#6e7681]">{detail ?? (index === 0 ? 'Waiting for a repository URL' : '—')}</p>
              </div>
            </li>
          )
        })}
        {last && ['ERROR', 'UNSUPPORTED'].includes(last.status) && (
          <li className="mt-1 border-t border-[#f85149]/30 pt-3">
            <p className="text-sm font-semibold text-[#f85149]">{last.status === 'UNSUPPORTED' ? 'This repository is not supported yet' : 'Preview could not be created'}</p>
            <p className="mt-1 text-sm leading-5 text-[#c9d1d9]">{last.message}</p>
          </li>
        )}
      </ol>
    </aside>
  )
}

export function InlinePreview() {
  const [preview, setPreview] = useState<{ jobId: string; previewUrl: string } | null>(null)
  const [result, setResult] = useState<EvalResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [destroying, setDestroying] = useState(false)
  const [destroyError, setDestroyError] = useState('')

  useEffect(() => {
    const previewHandler = (event: Event) => {
      setResult(null)
      setPreview((event as CustomEvent<{ jobId: string; previewUrl: string }>).detail)
    }
    const evaluationHandler = async (event: Event) => {
      const { jobId } = (event as CustomEvent<{ jobId: string }>).detail
      try {
        const response = await fetch(`/api/jobs/${jobId}/result`)
        if (response.ok) setResult(await response.json() as EvalResult)
      } catch {
        // The report stays available on the dedicated results page if this fetch fails.
      }
    }
    window.addEventListener('trysdk:preview', previewHandler)
    window.addEventListener('trysdk:evaluation-ready', evaluationHandler)
    return () => {
      window.removeEventListener('trysdk:preview', previewHandler)
      window.removeEventListener('trysdk:evaluation-ready', evaluationHandler)
    }
  }, [])

  if (!preview) return null
  const activePreview = preview
  // Keep the preview on the deployed Try SDK origin. The route attaches the
  // Daytona token server-side and suppresses the provider warning page.
  const iframeUrl = `/api/preview/${activePreview.jobId}/`

  async function destroySandbox() {
    setDestroying(true)
    setDestroyError('')
    try {
      const response = await fetch(`/api/jobs/${activePreview.jobId}/destroy`, { method: 'POST' })
      if (!response.ok) throw new Error('Unable to destroy this sandbox')
      setPreview(null)
    } catch (error) {
      setDestroyError(error instanceof Error ? error.message : 'Unable to destroy this sandbox')
    } finally {
      setDestroying(false)
    }
  }

  return (
    <>
      <section className="mx-auto max-w-[1080px] px-6 pb-8" aria-label="Live repository preview">
        <div className="overflow-hidden rounded-lg border border-[#30363d] bg-[#161b22]">
          <div className="flex items-center justify-between gap-3 border-b border-[#21262d] bg-[#1c2128] px-4 py-3"><span className="font-mono text-xs text-[#8b949e]">preview · live sandbox</span><span className="text-xs font-semibold text-[#3fb950]">● Live</span></div>
          <div className="relative h-[min(78vh,56rem)] min-h-[38rem] bg-[#010409]"><iframe title="Repository preview" src={iframeUrl} className="absolute inset-0 h-full w-full border-0" allow="fullscreen" /></div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[#21262d] bg-[#1c2128] px-4 py-3"><a href={iframeUrl} target="_blank" rel="noreferrer" className="rounded-md bg-[#238636] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2ea043]">Open preview</a><button type="button" onClick={async () => { await navigator.clipboard.writeText(iframeUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }} className="rounded-md border border-[#30363d] px-3 py-1.5 text-xs text-[#c9d1d9] hover:border-[#8b949e]">{copied ? 'Copied' : 'Copy link'}</button><button type="button" onClick={destroySandbox} disabled={destroying} className="rounded-md border border-[#f85149]/60 px-3 py-1.5 text-xs font-semibold text-[#f85149] transition-colors hover:bg-[#da3633]/15 disabled:cursor-not-allowed disabled:opacity-60">{destroying ? 'Destroying…' : 'Destroy'}</button>{destroyError && <p role="alert" className="basis-full text-xs text-[#f85149]">{destroyError}</p>}</div>
        </div>
      </section>

      {result && (
        <section className="mx-auto max-w-[1080px] px-6 pb-12" aria-labelledby="evaluation-report-heading">
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-6 sm:p-8">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#58a6ff]">Screenshot evaluation</p>
            <h2 id="evaluation-report-heading" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#f0f6fc]">Product-fit report</h2>
            <div className="mt-6"><FitReport result={result} /></div>
          </div>
        </section>
      )}
    </>
  )
}
