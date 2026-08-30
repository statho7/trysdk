import { waitUntil } from '@vercel/functions'
import { createJob, emitStatus, updateJob } from '@/lib/jobs'
import { createSandbox, cloneRepo, execCommand, startBackground, getPreviewUrl, deleteSandbox } from '@/lib/sandbox'
import { detectStack } from '@/lib/detector'
import type { Job } from '@/lib/types'

async function runPipeline(job: Job) {
  let sandbox = null
  let keepSandbox = false
  try {
    // 1. Clone
    emitStatus(job.id, 'CLONING', 'Cloning repository into sandbox...')
    sandbox = await createSandbox()
    updateJob(job.id, { sandboxId: sandbox.id })
    await cloneRepo(sandbox, job.githubUrl)

    // 2. Detect stack + install deps
    emitStatus(job.id, 'INSTALLING', 'Detecting stack and installing dependencies...')
    const { result: lsOutput } = await execCommand(sandbox, 'find workspace/repo -maxdepth 3 -type f | head -100')
    const fileList = lsOutput.split('\n').filter(Boolean)
    const stack = detectStack(fileList)
    await execCommand(sandbox, stack.installCmd, 300)

    // 3. Start app
    emitStatus(job.id, 'RUNNING', `Starting ${stack.language} app on port ${stack.port}...`)
    await startBackground(sandbox, 'app', stack.startCmd)
    // Give the app a moment to bind
    await new Promise(resolve => setTimeout(resolve, 5000))

    const { url: previewUrl, token: previewToken } = await getPreviewUrl(sandbox, stack.port)
    updateJob(job.id, { previewUrl, previewToken })
    emitStatus(job.id, 'READY', `App is live at ${previewUrl}`)
    keepSandbox = true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emitStatus(job.id, 'ERROR', `Pipeline failed: ${message}`)
  } finally {
    if (sandbox && !keepSandbox) await deleteSandbox(sandbox)
  }
}

export async function POST(request: Request) {
  let body: { useCase?: string; githubUrl?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { useCase, githubUrl } = body
  if (!useCase?.trim() || !githubUrl?.trim()) {
    return Response.json({ error: 'useCase and githubUrl are required' }, { status: 400 })
  }

  const job = createJob(githubUrl.trim(), useCase.trim())
  // waitUntil keeps the pipeline running after the response is sent (Vercel Fluid Compute)
  waitUntil(runPipeline(job))

  return Response.json({ jobId: job.id })
}
