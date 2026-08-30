import type { StatusEvent, JobStatus } from '@/lib/types'

const STATUS_LABELS: Record<JobStatus, string> = {
  CREATING_SANDBOX: 'Creating sandbox',
  CLONING: 'Cloning',
  INSPECTING: 'Inspecting project',
  INSTALLING: 'Installing',
  RUNNING: 'Starting app',
  READY: 'App live',
  ANALYZING: 'Analyzing',
  DONE: 'Done',
  DESTROYING: 'Destroying sandbox',
  DESTROYED: 'Sandbox destroyed',
  UNSUPPORTED: 'Unsupported project',
  ERROR: 'Error',
}

const STATUS_ORDER: JobStatus[] = ['CREATING_SANDBOX', 'CLONING', 'INSPECTING', 'INSTALLING', 'RUNNING', 'READY', 'DESTROYING', 'DESTROYED']

function StatusIcon({ isCurrent, isError }: { isCurrent: boolean; isError: boolean }) {
  if (isError) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#f85149]/60 bg-[#da3633]/15 text-xs font-bold text-[#f85149]">
        ✕
      </div>
    )
  }
  if (isCurrent) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#58a6ff]/70 bg-[#1f6feb]/15">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#58a6ff]" />
      </div>
    )
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#238636] bg-[#238636]/15 text-xs text-[#3fb950]">
      ✓
    </div>
  )
}

interface Props {
  events: StatusEvent[]
}

export function StatusFeed({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-[#8b949e]">Preparing your sandbox…</p>
  }

  const lastEvent = events[events.length - 1]
  const isError = lastEvent.status === 'ERROR' || lastEvent.status === 'UNSUPPORTED'

  // Collect the last message per status for display
  const seenStatuses = new Map<JobStatus, StatusEvent>()
  for (const event of events) {
    seenStatuses.set(event.status, event)
  }

  const visibleStatuses = isError
    ? [...seenStatuses.keys()]
    : STATUS_ORDER.filter(s => seenStatuses.has(s))

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {visibleStatuses.map((status, idx) => {
        const event = seenStatuses.get(status)!
        const isCurrent = status === lastEvent.status && !isError
        const done = !isCurrent && !isError

        return (
          <div key={status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StatusIcon isCurrent={isCurrent} isError={isError && idx === visibleStatuses.length - 1} />
              {idx < visibleStatuses.length - 1 && (
                <div className={`mt-1 min-h-4 w-px flex-1 ${done ? 'bg-[#238636]' : 'bg-[#30363d]'}`} />
              )}
            </div>
            <div className="pb-3">
              <p className={`text-sm font-medium ${isCurrent ? 'text-[#58a6ff]' : isError && idx === visibleStatuses.length - 1 ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                {STATUS_LABELS[status]}
              </p>
              <p className="mt-0.5 text-xs text-[#8b949e]">{event.message}</p>
              <p className="mt-0.5 text-xs text-[#6e7681]">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
