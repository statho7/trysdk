import { getJob, getEvents } from '@/lib/jobs'

export const maxDuration = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = getJob(jobId)
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  let lastIndex = 0
  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    async start(controller) {
      const flush = () => {
        const allEvents = getEvents(jobId)
        const newEvents = allEvents.slice(lastIndex)
        for (const event of newEvents) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        lastIndex += newEvents.length

        const currentJob = getJob(jobId)
        if (currentJob?.status === 'DONE' || currentJob?.status === 'DESTROYED' || currentJob?.status === 'ERROR') {
          controller.close()
          if (timer) clearInterval(timer)
        }
      }

      flush()
      timer = setInterval(flush, 500)
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
