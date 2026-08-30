import { DaytonaNotFoundError } from '@daytona/sdk'
import { deleteSandboxById } from '@/lib/sandbox'
import { emitStatus, getJob } from '@/lib/jobs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = await getJob(jobId)

  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (!job.sandboxId) return Response.json({ error: 'Sandbox is not available for this job' }, { status: 409 })
  if (job.status === 'DESTROYED') return Response.json({ status: 'destroyed' })

  await emitStatus(jobId, 'DESTROYING', 'Destroying sandbox...')
  try {
    await deleteSandboxById(job.sandboxId)
    await emitStatus(jobId, 'DESTROYED', 'Sandbox destroyed')
    return Response.json({ status: 'destroyed' })
  } catch (err) {
    const isAlreadyDeleted = err instanceof DaytonaNotFoundError ||
      (err instanceof Error && (/DaytonaNotFoundError|Sandbox with ID or name .* not found/i).test(err.message))

    if (isAlreadyDeleted) {
      await emitStatus(jobId, 'DESTROYED', 'Sandbox was already removed')
      return Response.json({ status: 'destroyed', alreadyDestroyed: true })
    }

    const message = err instanceof Error ? err.message : String(err)
    await emitStatus(jobId, 'ERROR', `Failed to destroy sandbox: ${message}`)
    return Response.json({ error: message }, { status: 500 })
  }
}
