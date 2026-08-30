import type { StatusEvent, JobStatus } from '@/lib/types'

const STATUS_LABELS: Record<JobStatus, string> = {
  CREATING_SANDBOX: 'Creating sandbox',
  CLONING: 'Cloning',
  INSPECTING: 'Inspecting project',
  INSTALLING: 'Installing',
  RUNNING: 'Starting app',
  READY: 'App live',
  ANALYZING: 'Evaluating product fit',
  DONE: 'Done',
  DESTROYING: 'Destroying sandbox',
  DESTROYED: 'Sandbox destroyed',
  UNSUPPORTED: 'Unsupported project',
  ERROR: 'Error',
}

const STATUS_ORDER: JobStatus[] = ['CREATING_SANDBOX', 'CLONING', 'INSPECTING', 'INSTALLING', 'RUNNING', 'READY', 'ANALYZING', 'DONE', 'DESTROYING', 'DESTROYED']

function StatusIcon({ isCurrent, isError }: { isCurrent: boolean; isError: boolean }) {
  if (isError) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--gh-danger)]/60 bg-[var(--gh-danger-emphasis)]/15 text-xs font-bold text-[var(--gh-danger)]">
        ✕
      </div>
    )
  }
  if (isCurrent) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--gh-accent)]/70 bg-[var(--gh-accent-emphasis)]/15">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--gh-accent)]" />
      </div>
    )
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--gh-success-emphasis)] bg-[var(--gh-success-emphasis)]/15 text-xs text-[var(--gh-success)]">
      ✓
    </div>
  )
}

interface Props {
  events: StatusEvent[]
}

export function StatusFeed({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--gh-fg-muted)]">Preparing your sandbox…</p>
  }

  const lastEvent = events[events.length - 1]
  const isError = lastEvent.status === 'ERROR' || lastEvent.status === 'UNSUPPORTED'

  // Collect the last message per status for display
  const seenStatuses = new Map<JobStatus, StatusEvent>()
  for (const event of events) {
    seenStatuses.set(event.status, event)
  }

  // The preview is usable before the evaluator sends its first server-side
  // update. Surface that handoff immediately instead of leaving the timeline
  // visually complete at "App live".
  const isAwaitingEvaluation = seenStatuses.has('READY') &&
    !seenStatuses.has('ANALYZING') &&
    !seenStatuses.has('DONE') &&
    !isError &&
    !seenStatuses.has('DESTROYED')

  const visibleStatuses = isError
    ? [...seenStatuses.keys()]
    : STATUS_ORDER.filter(status => seenStatuses.has(status) || (status === 'ANALYZING' && isAwaitingEvaluation))

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {visibleStatuses.map((status, idx) => {
        const event = seenStatuses.get(status) ?? {
          status: 'ANALYZING' as const,
          message: 'Starting browser-based evaluation…',
          timestamp: lastEvent.timestamp,
        }
        const isCurrent = !isError && (status === lastEvent.status || (status === 'ANALYZING' && isAwaitingEvaluation))
        const done = !isCurrent && !isError

        return (
          <div key={status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StatusIcon isCurrent={isCurrent} isError={isError && idx === visibleStatuses.length - 1} />
              {idx < visibleStatuses.length - 1 && (
                <div className={`mt-1 min-h-4 w-px flex-1 ${done ? 'bg-[var(--gh-success-emphasis)]' : 'bg-[var(--gh-border)]'}`} />
              )}
            </div>
            <div className="pb-3">
              <p className={`text-sm font-medium ${isCurrent ? 'text-[var(--gh-accent)]' : isError && idx === visibleStatuses.length - 1 ? 'text-[var(--gh-danger)]' : 'text-[var(--gh-success)]'}`}>
                {STATUS_LABELS[status]}
              </p>
              <p className="mt-0.5 text-xs text-[var(--gh-fg-muted)]">{event.message}</p>
              <p className="mt-0.5 text-xs text-[var(--gh-fg-subtle)]">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
