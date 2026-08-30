export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn' | 'none'
export type Framework = 'vite' | 'astro' | 'static'
export type PreviewBasePathStrategy = 'vite' | 'astro' | 'static'

export interface PackageManifest {
  path: string
  content: string
}

export interface LaunchProject {
  framework: Framework
  projectRoot: string
  packageManager: PackageManager
  installCmd: string
  startCmd: string
  port: number
  previewBasePathStrategy: PreviewBasePathStrategy
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

interface PackageCandidate {
  path: string
  projectRoot: string
  packageJson: PackageJson
  script: string
}

const quoteShell = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

const STATIC_SERVER = `const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve(process.argv[1]),prefix=process.argv[2].replace(/\\/?$/,'/');const mime={'.css':'text/css','.html':'text/html','.ico':'image/x-icon','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2'};http.createServer((req,res)=>{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.startsWith(prefix))pathname=pathname.slice(prefix.length-1);if(pathname==='/')pathname='/index.html';const file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}fs.stat(file,(statError,stats)=>{const target=!statError&&stats.isDirectory()?path.join(file,'index.html'):file;fs.readFile(target,(readError,data)=>{if(readError){res.writeHead(readError.code==='ENOENT'?404:500);return res.end(readError.code==='ENOENT'?'Not found':'Server error')}res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)})})}).listen(5173,'0.0.0.0')`

function packageManagerFor(projectRoot: string, filePaths: string[]): { packageManager: Exclude<PackageManager, 'none'>; installRoot: string; hasNpmLock: boolean } {
  let root = projectRoot
  while (true) {
    const lockfiles = [
      ['bun.lock', 'bun'],
      ['bun.lockb', 'bun'],
      ['pnpm-lock.yaml', 'pnpm'],
      ['yarn.lock', 'yarn'],
      ['package-lock.json', 'npm'],
    ].filter(([name]) => filePaths.includes(`${root}/${name}`)) as [string, Exclude<PackageManager, 'none'>][]

    if (lockfiles.length > 1) throw new UnsupportedProjectError(`Conflicting lockfiles were found in ${root}. Keep one package manager lockfile.`)
    if (lockfiles.length === 1) return { packageManager: lockfiles[0][1], installRoot: root, hasNpmLock: lockfiles[0][0] === 'package-lock.json' }
    if (root === 'workspace/repo') break
    root = root.slice(0, root.lastIndexOf('/'))
  }
  return { packageManager: 'npm', installRoot: projectRoot, hasNpmLock: false }
}

function commandsFor(installRoot: string, runRoot: string, packageManager: Exclude<PackageManager, 'none'>, script: string, hasNpmLock: boolean): Pick<LaunchProject, 'installCmd' | 'startCmd'> {
  const installDirectory = quoteShell(installRoot)
  const runDirectory = quoteShell(runRoot)
  if (packageManager === 'pnpm') return { installCmd: `cd ${installDirectory} && corepack pnpm install --frozen-lockfile`, startCmd: `cd ${runDirectory} && corepack pnpm run ${script}` }
  if (packageManager === 'bun') return { installCmd: `command -v bun >/dev/null 2>&1 || npm install --global --no-audit --no-fund bun@1; cd ${installDirectory} && bun install --frozen-lockfile`, startCmd: `cd ${runDirectory} && bun run ${script}` }
  if (packageManager === 'yarn') return { installCmd: `cd ${installDirectory} && (corepack yarn install --immutable || corepack yarn install --frozen-lockfile)`, startCmd: `cd ${runDirectory} && corepack yarn ${script}` }
  return { installCmd: `cd ${installDirectory} && ${hasNpmLock ? 'npm ci' : 'npm install'} --no-audit --no-fund --fetch-retries=2 --fetch-retry-maxtimeout=10000`, startCmd: `cd ${runDirectory} && npm run ${script}` }
}

function packageCandidates(manifests: PackageManifest[]): PackageCandidate[] {
  return manifests.flatMap(({ path, content }) => {
    try {
      const packageJson = JSON.parse(content) as PackageJson
      const scripts = packageJson.scripts ?? {}
      const script = typeof scripts.dev === 'string' ? 'dev' : typeof scripts.start === 'string' ? 'start' : null
      if (!script) return []
      return [{ path, projectRoot: path.slice(0, -'/package.json'.length), packageJson, script }]
    } catch {
      return []
    }
  })
}

function selectSingleCandidate(candidates: PackageCandidate[], framework: string): PackageCandidate {
  if (candidates.length === 0) throw new UnsupportedProjectError(`No self-contained ${framework} application with a dev or start script was found.`)
  if (candidates.length > 1) throw new UnsupportedProjectError(`Multiple ${framework} applications were found. Choose a repository containing one frontend application for now.`)
  return candidates[0]
}

function projectFromCandidate(candidate: PackageCandidate, filePaths: string[], framework: Exclude<Framework, 'static'>): LaunchProject {
  const { packageManager, installRoot, hasNpmLock } = packageManagerFor(candidate.projectRoot, filePaths)
  return { framework, projectRoot: candidate.projectRoot, packageManager, port: 5173, previewBasePathStrategy: framework, ...commandsFor(installRoot, candidate.projectRoot, packageManager, candidate.script, hasNpmLock) }
}

export function detectProject(manifests: PackageManifest[], filePaths: string[]): LaunchProject {
  if (filePaths.some(path => /(?:^|\/)(?:docker-compose(?:\.[^/]+)?|compose\.ya?ml)$/i.test(path))) throw new UnsupportedProjectError('Docker Compose projects are not supported in this demo. Try a self-contained frontend repository instead.')
  if (filePaths.some(path => /(?:^|\/)Dockerfile$/i.test(path))) throw new UnsupportedProjectError('Docker-based projects are not supported in this demo. Try a self-contained frontend repository instead.')

  const candidates = packageCandidates(manifests)
  const dependenciesFor = (candidate: PackageCandidate) => ({ ...candidate.packageJson.dependencies, ...candidate.packageJson.devDependencies })
  const astroCandidates = candidates.filter(candidate => Boolean(dependenciesFor(candidate).astro))
  if (astroCandidates.length > 0) return projectFromCandidate(selectSingleCandidate(astroCandidates, 'Astro'), filePaths, 'astro')

  const viteCandidates = candidates.filter(candidate => {
    const dependencies = dependenciesFor(candidate)
    const scripts = candidate.packageJson.scripts ?? {}
    return Boolean(dependencies.vite) || filePaths.some(file => file.startsWith(`${candidate.projectRoot}/vite.config.`)) || Object.values(scripts).some(value => /\bvite\b/.test(value))
  })
  if (viteCandidates.length > 0) return projectFromCandidate(selectSingleCandidate(viteCandidates, 'Vite'), filePaths, 'vite')

  const unsupportedFramework = candidates.find(candidate => {
    const dependencies = dependenciesFor(candidate)
    return Boolean(dependencies.next || dependencies.nuxt || dependencies['@remix-run/dev'] || dependencies['@remix-run/react'] || dependencies['react-router'])
  })
  if (unsupportedFramework) throw new UnsupportedProjectError('This framework is not supported for inline previews yet. Try SDK currently supports Vite, Astro, and dependency-free static HTML sites.')

  if (manifests.length === 0 && filePaths.includes('workspace/repo/index.html')) return { framework: 'static', projectRoot: 'workspace/repo', packageManager: 'none', installCmd: 'true', startCmd: `node -e ${quoteShell(STATIC_SERVER)} ${quoteShell('workspace/repo')}`, port: 5173, previewBasePathStrategy: 'static' }
  throw new UnsupportedProjectError('No supported frontend entry point was found. Try SDK currently supports Vite, Astro, and dependency-free static HTML sites.')
}

export function startCommandFor(project: LaunchProject, previewBasePath: string): string {
  const basePath = quoteShell(previewBasePath)
  if (project.previewBasePathStrategy === 'vite') return `${project.startCmd} -- --host 0.0.0.0 --port ${project.port} --strictPort --base ${basePath}`
  if (project.previewBasePathStrategy === 'astro') return `${project.startCmd} -- --host 0.0.0.0 --port ${project.port} --base ${basePath}`
  return `${project.startCmd} ${basePath}`
}
