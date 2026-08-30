export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export interface PackageManifest {
  path: string
  content: string
}

export interface ViteProject {
  framework: 'vite'
  projectRoot: string
  packageManager: PackageManager
  installCmd: string
  startCmd: string
  port: number
}

export class UnsupportedProjectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedProjectError'
  }
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

const quoteShell = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

function packageManagerFor(projectRoot: string, filePaths: string[]): { packageManager: PackageManager; installRoot: string; hasNpmLock: boolean } {
  let root = projectRoot
  while (true) {
    const lockfiles = [
      ['pnpm-lock.yaml', 'pnpm'],
      ['yarn.lock', 'yarn'],
      ['package-lock.json', 'npm'],
    ].filter(([name]) => filePaths.includes(`${root}/${name}`)) as [string, PackageManager][]

    if (lockfiles.length > 1) {
      throw new UnsupportedProjectError(`Conflicting lockfiles were found in ${root}. Keep one package manager lockfile.`)
    }
    if (lockfiles.length === 1) {
      return { packageManager: lockfiles[0][1], installRoot: root, hasNpmLock: lockfiles[0][0] === 'package-lock.json' }
    }
    if (root === 'workspace/repo') break
    root = root.slice(0, root.lastIndexOf('/'))
  }

  return { packageManager: 'npm', installRoot: projectRoot, hasNpmLock: false }
}

function commandsFor(installRoot: string, runRoot: string, packageManager: PackageManager, script: string, hasNpmLock: boolean): Pick<ViteProject, 'installCmd' | 'startCmd'> {
  const installDirectory = quoteShell(installRoot)
  const runDirectory = quoteShell(runRoot)

  if (packageManager === 'pnpm') {
    return {
      installCmd: `cd ${installDirectory} && corepack pnpm install --frozen-lockfile --dangerously-allow-all-builds`,
      startCmd: `cd ${runDirectory} && corepack pnpm run ${script} -- --host 0.0.0.0 --port 5173 --strictPort`,
    }
  }

  if (packageManager === 'yarn') {
    return {
      installCmd: `cd ${installDirectory} && (corepack yarn install --immutable || corepack yarn install --frozen-lockfile)`,
      startCmd: `cd ${runDirectory} && corepack yarn ${script} --host 0.0.0.0 --port 5173 --strictPort`,
    }
  }

  return {
    installCmd: `cd ${installDirectory} && ${hasNpmLock ? 'npm ci' : 'npm install'}`,
    startCmd: `cd ${runDirectory} && npm run ${script} -- --host 0.0.0.0 --port 5173 --strictPort`,
  }
}

export function detectViteProject(manifests: PackageManifest[], filePaths: string[]): ViteProject {
  const viteCandidates = manifests.flatMap(({ path, content }) => {
    let packageJson: PackageJson
    try {
      packageJson = JSON.parse(content) as PackageJson
    } catch {
      return []
    }

    const projectRoot = path.slice(0, -'/package.json'.length)
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    const scripts = packageJson.scripts ?? {}
    const script = typeof scripts.dev === 'string' ? 'dev' : typeof scripts.start === 'string' ? 'start' : null
    const hasViteConfig = filePaths.some(file => file.startsWith(`${projectRoot}/vite.config.`))
    const usesVite = Boolean(dependencies.vite) || hasViteConfig || Object.values(scripts).some(value => /\bvite\b/.test(value))
    if (!usesVite || !script) return []

    return [{ path, script }]
  })

  if (viteCandidates.length === 0) {
    throw new UnsupportedProjectError('No self-contained Vite application with a dev or start script was found.')
  }

  if (viteCandidates.length > 1) {
    throw new UnsupportedProjectError('Multiple Vite applications were found. Choose a repository containing one frontend application for now.')
  }

  const candidate = viteCandidates[0]
  const projectRoot = candidate.path.slice(0, -'/package.json'.length)
  const { packageManager, installRoot, hasNpmLock } = packageManagerFor(projectRoot, filePaths)
  const commands = commandsFor(installRoot, projectRoot, packageManager, candidate.script, hasNpmLock)

  return {
    framework: 'vite',
    projectRoot,
    packageManager,
    port: 5173,
    ...commands,
  }
}
