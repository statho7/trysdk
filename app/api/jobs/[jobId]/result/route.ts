import { getJob } from '@/lib/jobs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = getJob(jobId)

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }
  if (!job.result) {
    return Response.json({ error: 'Result not ready' }, { status: 404 })
  }

  return Response.json(job.result)
}
