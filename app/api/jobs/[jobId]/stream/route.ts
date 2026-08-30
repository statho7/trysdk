import { getJob, getEvents } from '@/lib/jobs'

export const maxDuration = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = await getJob(jobId)
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  let lastIndex = 0
  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setInterval> | undefined
  let closed = false
  let flushing = false

  const stream = new ReadableStream({
    async start(controller) {
      const flush = async () => {
        if (closed || flushing) return
        flushing = true
        try {
          const allEvents = await getEvents(jobId)
          const newEvents = allEvents.slice(lastIndex)
          for (const event of newEvents) {
            if (closed) return
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
          lastIndex += newEvents.length

          const currentJob = await getJob(jobId)
          if (currentJob?.status === 'DONE' || currentJob?.status === 'DESTROYED' || currentJob?.status === 'UNSUPPORTED' || currentJob?.status === 'ERROR') {
            closed = true
            if (timer) clearInterval(timer)
            controller.close()
          }
        } catch {
          // The client may have disconnected between polling and enqueueing.
          closed = true
          if (timer) clearInterval(timer)
        } finally {
          flushing = false
        }
      }

      await flush()
      timer = setInterval(() => { void flush() }, 500)
    },
    cancel() {
      closed = true
      if (timer) clearInterval(timer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
