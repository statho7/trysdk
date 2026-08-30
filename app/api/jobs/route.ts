import { waitUntil } from '@vercel/functions'
import type { Sandbox } from '@daytona/sdk'
import { createJob, emitStatus, updateJob } from '@/lib/jobs'
import { createSandbox, cloneRepo, execCommand, getPreviewUrl, startBackground, waitForHttpReady, deleteSandbox, PreviewCapacityError } from '@/lib/sandbox'
import { detectViteProject, UnsupportedProjectError } from '@/lib/detector'
import { captureScreenshots } from '@/lib/scout'
import { evaluateScreenshots } from '@/lib/evaluator'
import type { Job } from '@/lib/types'

const quoteShell = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

function getInstallTimeoutSeconds(): number {
  const configured = Number(process.env.PREVIEW_INSTALL_TIMEOUT_SECONDS ?? 120)
  return Number.isFinite(configured) ? Math.min(300, Math.max(30, configured)) : 120
}

function evaluationCredential(request?: Request): string | undefined {
  return process.env.AI_GATEWAY_API_KEY || request?.headers.get('x-vercel-oidc-token') || process.env.VERCEL_OIDC_TOKEN || undefined
}

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

async function runPipeline(job: Job, gatewayApiKey?: string) {
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
    const { result: lsOutput } = await execCommand(activeSandbox, 'find workspace/repo -maxdepth 4 -type f \\( -name package.json -o -name package-lock.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name bun.lock -o -name bun.lockb \\) -print')
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
    const installTimeoutSeconds = getInstallTimeoutSeconds()
    const install = await execCommand(
      activeSandbox,
      `timeout ${installTimeoutSeconds}s sh -lc ${quoteShell(project.installCmd)}`,
      installTimeoutSeconds + 10,
    )
    if (install.exitCode === 124) {
      throw new Error(`Dependency installation timed out after ${installTimeoutSeconds} seconds. This repository's dependency setup is too heavy or needs a runtime we do not support yet.`)
    }
    if (install.exitCode !== 0) throw new Error(`Dependency installation failed: ${install.result.slice(-500)}`)

    await emitStatus(job.id, 'RUNNING', `Starting Vite on port ${project.port}...`)
    // Vite serves its client and assets beneath this path, so every browser
    // request stays on the Vercel-hosted authenticated preview proxy.
    const previewBasePath = `/api/preview/${job.id}/`
    await startBackground(activeSandbox, 'app', `${project.startCmd} --base ${quoteShell(previewBasePath)}`)
    await waitForHttpReady(activeSandbox, project.port)

    const { url: previewUrl, token: previewToken, proxyUrl: previewProxyUrl, proxyToken: previewProxyToken } = await getPreviewUrl(activeSandbox, project.port)
    await updateJob(job.id, { previewUrl, previewToken, previewProxyUrl, previewProxyToken })
    await emitStatus(job.id, 'READY', `App is live at ${previewUrl}`)
    keepSandbox = true

    if (!job.shouldEvaluate) {
      await emitStatus(job.id, 'DONE', 'Preview is live')
      return
    }

    if (!gatewayApiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      await emitStatus(job.id, 'DONE', 'Preview is live. Assessment needs a Gemini or AI Gateway credential.')
      return
    }

    try {
      await emitStatus(job.id, 'ANALYZING', 'Preparing browser-based evaluation...')
      const screenshots = await captureScreenshots(
        activeSandbox,
        project.port,
        project.projectRoot,
        message => emitStatus(job.id, 'ANALYZING', message),
      )
      await emitStatus(job.id, 'ANALYZING', `Captured ${screenshots.length} screen${screenshots.length === 1 ? '' : 's'} — Gemini is assessing the evidence against your goal...`)
      const result = await evaluateScreenshots(job.useCase, screenshots, gatewayApiKey)
      await updateJob(job.id, { result: { ...result, jobId: job.id } })
      await emitStatus(job.id, 'DONE', 'Evaluation report is ready')
    } catch (evaluationError) {
      // The preview is already live. A best-effort report must not relabel a
      // successful preview as a failed pipeline.
      console.error('Preview evaluation failed:', evaluationError)
      await emitStatus(job.id, 'DONE', 'Preview is live. Automated evaluation was unavailable for this run.')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof UnsupportedProjectError) {
      await emitStatus(job.id, 'UNSUPPORTED', message)
    } else if (err instanceof PreviewCapacityError) {
      await emitStatus(job.id, 'ERROR', message)
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
  if (!githubUrl?.trim()) {
    return Response.json({ error: 'githubUrl is required' }, { status: 400 })
  }
  if (!isPublicGithubRepositoryUrl(githubUrl.trim())) {
    return Response.json({ error: 'Enter a public HTTPS GitHub repository URL, such as https://github.com/owner/repository.' }, { status: 400 })
  }

  const job = await createJob(githubUrl.trim(), useCase)
  // waitUntil keeps the pipeline running after the response is sent (Vercel Fluid Compute)
  // Vercel exposes runtime OIDC as a request header. Keep it only in memory
  // for this background task; never persist a credential with the job.
  waitUntil(runPipeline(job, evaluationCredential(request)))

  return Response.json({ jobId: job.id, assessmentRequested: job.shouldEvaluate })
}
