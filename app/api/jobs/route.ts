import { waitUntil } from '@vercel/functions'
import { createJob, emitStatus, updateJob } from '@/lib/jobs'
import { createSandbox, cloneRepo, execCommand, startBackground, getPreviewUrl, uploadFile, downloadFile, deleteSandbox } from '@/lib/sandbox'
import { detectStack } from '@/lib/detector'
import { evaluateScreenshots } from '@/lib/evaluator'
import type { Job, Screenshot } from '@/lib/types'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runPipeline(job: Job) {
  let sandbox = null
  try {
    // 1. Clone
    emitStatus(job.id, 'CLONING', 'Cloning repository into sandbox...')
    sandbox = await createSandbox()
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

    // 4. Run scout
    // TODO: Uncomment when scout script execution is wired up
    // const scoutScript = readFileSync(join(process.cwd(), 'scripts/scout.playwright.ts'), 'utf-8')
    // await uploadFile(sandbox, scoutScript, '/workspace/scout.ts')
    // await execCommand(sandbox, 'npm install -g tsx playwright && npx playwright install chromium', 300)
    // await execCommand(sandbox, `APP_URL=${previewUrl} PREVIEW_TOKEN=${previewToken} OUTPUT_DIR=/tmp/shots tsx /workspace/scout.ts`, 120)

    emitStatus(job.id, 'ANALYZING', 'Agent is analyzing the app...')

    // TODO: Download real screenshots from sandbox
    // const routesJson = await downloadFile(sandbox, '/tmp/shots/routes.json')
    // const routes = JSON.parse(routesJson.toString()) as { route: string; filePath: string }[]
    // const screenshots: Screenshot[] = await Promise.all(routes.map(async ({ route, filePath }) => {
    //   const imgBuffer = await downloadFile(sandbox, filePath)
    //   return { route, description: route, base64: imgBuffer.toString('base64') }
    // }))

    const screenshots: Screenshot[] = [] // TODO: replace with real screenshots

    const result = await evaluateScreenshots(job.useCase, screenshots)
    updateJob(job.id, { result: { ...result, jobId: job.id } })
    emitStatus(job.id, 'DONE', 'Evaluation complete')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emitStatus(job.id, 'ERROR', `Pipeline failed: ${message}`)
  } finally {
    if (sandbox) await deleteSandbox(sandbox)
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
