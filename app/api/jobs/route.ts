import { waitUntil } from '@vercel/functions'
import type { Sandbox } from '@daytona/sdk'
import { createJob, emitStatus, updateJob } from '@/lib/jobs'
import { createSandbox, cloneRepo, execCommand, getPreviewUrl, startBackground, waitForHttpReady, deleteSandbox } from '@/lib/sandbox'
import { detectViteProject, UnsupportedProjectError } from '@/lib/detector'
import { captureScreenshots } from '@/lib/scout'
import { evaluateScreenshots } from '@/lib/evaluator'
import type { Job } from '@/lib/types'

const quoteShell = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

function isPublicGithubRepositoryUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const segments = url.pathname.split('/').filter(Boolean)
    return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password &&
      segments.length === 2 && !url.search && !url.hash
  } catch {
    return false
  }
}

async function runPipeline(job: Job) {
  let sandbox: Sandbox | null = null
  let keepSandbox = false
  try {
    // 1. Clone
    await emitStatus(job.id, 'CREATING_SANDBOX', 'Creating an isolated sandbox...')
    const activeSandbox = await createSandbox()
    sandbox = activeSandbox
    await updateJob(job.id, { sandboxId: activeSandbox.id })

    await emitStatus(job.id, 'CLONING', 'Cloning repository into sandbox...')
    await cloneRepo(activeSandbox, job.githubUrl)

    await emitStatus(job.id, 'INSPECTING', 'Inspecting package files and Vite configuration...')
    const { result: lsOutput } = await execCommand(activeSandbox, 'find workspace/repo -maxdepth 4 -type f \\( -name package.json -o -name package-lock.json -o -name pnpm-lock.yaml -o -name yarn.lock \\) -print')
    const fileList = lsOutput.split('\n').filter(Boolean)
    const manifests = await Promise.all(fileList.filter(path => path.endsWith('/package.json')).map(async path => {
      const manifest = await execCommand(activeSandbox, `cat -- ${quoteShell(path)}`)
      if (manifest.exitCode !== 0) throw new Error(`Could not read ${path}: ${manifest.result}`)
      return { path, content: manifest.result }
    }))
    const project = detectViteProject(manifests, fileList)
    await updateJob(job.id, {
      framework: project.framework,
      packageManager: project.packageManager,
      projectRoot: project.projectRoot,
      port: project.port,
    })

    await emitStatus(job.id, 'INSTALLING', `Installing dependencies with ${project.packageManager}...`)
    const install = await execCommand(activeSandbox, project.installCmd, 180)
    if (install.exitCode !== 0) throw new Error(`Dependency installation failed: ${install.result.slice(-500)}`)

    await emitStatus(job.id, 'RUNNING', `Starting Vite on port ${project.port}...`)
    await startBackground(activeSandbox, 'app', project.startCmd)
    await waitForHttpReady(activeSandbox, project.port)

    const { url: previewUrl, token: previewToken } = await getPreviewUrl(activeSandbox, project.port)
    await updateJob(job.id, { previewUrl, previewToken })
    await emitStatus(job.id, 'READY', `App is live at ${previewUrl}`)
    keepSandbox = true

    await emitStatus(job.id, 'ANALYZING', 'Preparing browser-based evaluation...')
    const screenshots = await captureScreenshots(
      activeSandbox,
      project.port,
      project.projectRoot,
      message => emitStatus(job.id, 'ANALYZING', message),
    )
    await emitStatus(job.id, 'ANALYZING', 'Gemini is assessing the screenshot evidence against your goal...')
    const result = await evaluateScreenshots(job.useCase, screenshots)
    await updateJob(job.id, { result: { ...result, jobId: job.id } })
    await emitStatus(job.id, 'DONE', 'Evaluation report is ready')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof UnsupportedProjectError) {
      await emitStatus(job.id, 'UNSUPPORTED', message)
    } else {
      await emitStatus(job.id, 'ERROR', `Pipeline failed: ${message}`)
    }
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
  if (!isPublicGithubRepositoryUrl(githubUrl.trim())) {
    return Response.json({ error: 'Enter a public HTTPS GitHub repository URL, such as https://github.com/owner/repository.' }, { status: 400 })
  }

  const job = await createJob(githubUrl.trim(), useCase.trim())
  // waitUntil keeps the pipeline running after the response is sent (Vercel Fluid Compute)
  waitUntil(runPipeline(job))

  return Response.json({ jobId: job.id })
}
