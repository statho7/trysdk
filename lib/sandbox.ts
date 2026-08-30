import { Daytona, Sandbox } from '@daytona/sdk'

function getDaytona(): Daytona {
  return new Daytona()
}

function getAutoStopMinutes(): number {
  const configured = Number(process.env.DAYTONA_AUTO_STOP_MINUTES ?? 30)
  return Number.isFinite(configured) && configured > 0 ? configured : 30
}

export async function createSandbox(): Promise<Sandbox> {
  try {
    return await getDaytona().create({
      image: 'node:22',
      resources: { cpu: 2, memory: 4, disk: 10 },
      autoStopInterval: getAutoStopMinutes(),
      autoDeleteInterval: 0,
    })
  } catch (err) {
    throw new Error(`Failed to create sandbox: ${err}`)
  }
}

export async function execCommand(
  sandbox: Sandbox,
  cmd: string,
  timeout?: number
): Promise<{ exitCode: number; result: string }> {
  try {
    const response = await sandbox.process.executeCommand(cmd, undefined, undefined, timeout)
    return { exitCode: response.exitCode, result: response.result }
  } catch (err) {
    throw new Error(`Command failed [${cmd.slice(0, 80)}]: ${err}`)
  }
}

export async function startBackground(
  sandbox: Sandbox,
  sessionName: string,
  cmd: string
): Promise<void> {
  try {
    await sandbox.process.createSession(sessionName)
    await sandbox.process.executeSessionCommand(sessionName, { command: cmd, runAsync: true })
  } catch (err) {
    throw new Error(`Failed to start background process: ${err}`)
  }
}

export async function waitForHttpReady(sandbox: Sandbox, port: number, timeoutSeconds = 45): Promise<void> {
  const command = `for attempt in $(seq 1 ${timeoutSeconds}); do node -e "fetch('http://127.0.0.1:${port}').then(() => process.exit(0)).catch(() => process.exit(1))" && exit 0; sleep 1; done; exit 1`
  try {
    const response = await sandbox.process.executeCommand(command, undefined, undefined, timeoutSeconds + 5)
    if (response.exitCode !== 0) throw new Error(`No HTTP response on port ${port} after ${timeoutSeconds} seconds`)
  } catch (err) {
    throw new Error(`Application did not become ready on port ${port}: ${err}`)
  }
}

export async function cloneRepo(sandbox: Sandbox, githubUrl: string): Promise<void> {
  try {
    // depth=1 shallow clone — avoids timeouts on large repos with long git histories
    await sandbox.git.clone(githubUrl, 'workspace/repo', undefined, undefined, undefined, undefined, undefined, 1)
  } catch (err) {
    throw new Error(`Failed to clone ${githubUrl}: ${err}`)
  }
}

export async function uploadFile(
  sandbox: Sandbox,
  content: string,
  remotePath: string
): Promise<void> {
  try {
    await sandbox.fs.uploadFile(Buffer.from(content), remotePath)
  } catch (err) {
    throw new Error(`Failed to upload file to ${remotePath}: ${err}`)
  }
}

export async function downloadFile(sandbox: Sandbox, remotePath: string): Promise<Buffer> {
  try {
    const data = await sandbox.fs.downloadFile(remotePath)
    return Buffer.from(data)
  } catch (err) {
    throw new Error(`Failed to download file from ${remotePath}: ${err}`)
  }
}

export async function getPreviewUrl(
  sandbox: Sandbox,
  port: number
): Promise<{ url: string; token: string }> {
  try {
    const preview = await sandbox.getPreviewLink(port)
    return { url: preview.url ?? '', token: preview.token ?? '' }
  } catch (err) {
    throw new Error(`Failed to get preview URL for port ${port}: ${err}`)
  }
}

export async function deleteSandbox(sandbox: Sandbox): Promise<void> {
  try {
    await sandbox.delete()
  } catch (err) {
    // Swallow — deletion is cleanup; a failure here shouldn't mask the real error
    console.error(`Failed to delete sandbox ${sandbox.id}: ${err}`)
  }
}

export async function deleteSandboxById(sandboxId: string): Promise<void> {
  try {
    const sandbox = await getDaytona().get(sandboxId)
    await sandbox.delete()
  } catch (err) {
    throw new Error(`Failed to delete sandbox ${sandboxId}: ${err}`)
  }
}
