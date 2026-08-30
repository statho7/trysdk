import type { StatusEvent, JobStatus } from '@/lib/types'

const STATUS_LABELS: Record<JobStatus, string> = {
  CLONING: 'Cloning',
  INSTALLING: 'Installing',
  RUNNING: 'Starting app',
  READY: 'App live',
  ANALYZING: 'Analyzing',
  DONE: 'Done',
  ERROR: 'Error',
}

const STATUS_ORDER: JobStatus[] = ['CLONING', 'INSTALLING', 'RUNNING', 'READY', 'ANALYZING', 'DONE']

function StatusIcon({ status, isCurrent, isError }: { status: JobStatus; isCurrent: boolean; isError: boolean }) {
  if (isError) {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-900/50 border border-red-700 text-red-400 text-xs font-bold shrink-0">
        ✕
      </div>
    )
  }
  if (isCurrent) {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-900/50 border border-indigo-600 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-900/40 border border-emerald-700 text-emerald-400 text-xs shrink-0">
      ✓
    </div>
  )
}

interface Props {
  events: StatusEvent[]
}

export function StatusFeed({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-zinc-500 text-sm">Waiting for pipeline to start…</p>
  }

  const lastEvent = events[events.length - 1]
  const isError = lastEvent.status === 'ERROR'

  // Collect the last message per status for display
  const seenStatuses = new Map<JobStatus, StatusEvent>()
  for (const event of events) {
    seenStatuses.set(event.status, event)
  }

  const visibleStatuses = isError
    ? [...seenStatuses.keys()]
    : STATUS_ORDER.filter(s => seenStatuses.has(s))

  return (
    <div className="flex flex-col gap-3 w-full max-w-xl">
      {visibleStatuses.map((status, idx) => {
        const event = seenStatuses.get(status)!
        const isCurrent = status === lastEvent.status && !isError
        const done = !isCurrent && !isError

        return (
          <div key={status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StatusIcon status={status} isCurrent={isCurrent} isError={isError && idx === visibleStatuses.length - 1} />
              {idx < visibleStatuses.length - 1 && (
                <div className={`w-px flex-1 mt-1 min-h-4 ${done ? 'bg-emerald-800' : 'bg-zinc-700'}`} />
              )}
            </div>
            <div className="pb-3">
              <p className={`text-sm font-medium ${isCurrent ? 'text-indigo-300' : isError && idx === visibleStatuses.length - 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {STATUS_LABELS[status]}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{event.message}</p>
              <p className="text-xs text-zinc-700 mt-0.5">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
