import type { Sandbox } from '@daytona/sdk'
import { execCommand } from './sandbox'
import type { Screenshot } from './types'

const MAX_SCREENSHOTS = 6
const EVALUATOR_ROOT = 'workspace/evaluator'
const quoteShell = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

const scoutProgram = String.raw`
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const appUrl = process.env.APP_URL;
const outputDir = process.env.OUTPUT_DIR;
const previewToken = process.env.PREVIEW_TOKEN;
const knownRoutes = ['/', '/login', '/signup', '/dashboard', '/settings', '/products', '/admin', '/users'];
const maxScreenshots = 6;
const captureBudgetMs = 30_000;
const routeTimeoutMs = 4_000;
const screenshotTimeoutMs = 12_000;

const normalizeRoute = (value) => {
  const url = new URL(value, appUrl);
  const base = new URL(appUrl);
  if (url.origin !== base.origin || !['http:', 'https:'].includes(url.protocol)) return null;
  return url.pathname + url.search;
};

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: previewToken ? { 'x-daytona-preview-token': previewToken } : {},
  });
  const page = await context.newPage();
  page.setDefaultTimeout(routeTimeoutMs);
  const queue = [new URL(appUrl).pathname || '/', ...knownRoutes];
  const visited = new Set();
  const captured = [];
  const failures = [];
  const deadline = Date.now() + captureBudgetMs;

  while (queue.length && captured.length < maxScreenshots && Date.now() < deadline) {
    const route = queue.shift();
    if (!route || visited.has(route)) continue;
    visited.add(route);
    try {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const response = await page.goto(new URL(route, appUrl).toString(), {
        waitUntil: 'domcontentloaded',
        timeout: Math.min(routeTimeoutMs, remainingMs),
      });
      if (!response) {
        failures.push({ route, error: 'Navigation returned no response' });
        continue;
      }
      if (response.status() >= 400) {
        failures.push({ route, error: 'Navigation returned HTTP ' + response.status() });
        continue;
      }
      await page.waitForTimeout(Math.min(500, Math.max(0, deadline - Date.now())));
      if (Date.now() >= deadline) break;
      const title = (await page.title()).trim();
      const heading = (await page.locator('h1').first().textContent({ timeout: 500 }).catch(() => '') || '').trim();
      const description = [title, heading].filter(Boolean).join(' — ') || 'Rendered application screen';
      const fileName = 'screen-' + captured.length + '.jpg';
      await page.screenshot({
        path: join(outputDir, fileName),
        type: 'jpeg',
        quality: 65,
        fullPage: false,
        timeout: Math.min(screenshotTimeoutMs, Math.max(1, deadline - Date.now())),
      });
      captured.push({ route, description, fileName });

      const hrefs = await page.locator('a[href]').evaluateAll(links => links.map(link => link.href));
      for (const href of hrefs) {
        const discovered = normalizeRoute(href);
        if (discovered && !visited.has(discovered) && !queue.includes(discovered)) queue.push(discovered);
      }
    } catch (error) {
      // A broken or protected route should not prevent inspection of the rest of the app.
      failures.push({ route, error: error instanceof Error ? error.message : String(error) });
    }
  }

  await writeFile(join(outputDir, 'screens.json'), JSON.stringify(captured));
  await writeFile(join(outputDir, 'failures.json'), JSON.stringify(failures));
  await browser.close();
}

main().catch(error => { console.error(error); process.exit(1); });
`

interface CapturedScreen {
  route: string
  description: string
  fileName: string
}

export async function captureScreenshots(
  sandbox: Sandbox,
  port: number,
  projectRoot: string,
  onProgress?: (message: string) => Promise<void>
): Promise<Screenshot[]> {
  const scoutPath = `${EVALUATOR_ROOT}/scout.mjs`
  const prepareEvaluator = await execCommand(sandbox, `mkdir -p ${EVALUATOR_ROOT}`, 30)
  if (prepareEvaluator.exitCode !== 0) throw new Error(`Could not create evaluator workspace: ${prepareEvaluator.result.slice(-500)}`)
  // `sandbox.fs.uploadFile` depends on form-data, which Next/Vercel cannot
  // bundle for this server-side execution path. Write the static script via
  // the sandbox shell instead.
  const encodedProgram = Buffer.from(scoutProgram).toString('base64')
  const writeScout = await execCommand(sandbox, `printf %s ${quoteShell(encodedProgram)} | base64 -d > ${quoteShell(scoutPath)}`, 30)
  if (writeScout.exitCode !== 0) throw new Error(`Could not write evaluator script: ${writeScout.result.slice(-500)}`)
  await onProgress?.('Preparing the preloaded Chromium evaluator...')
  const install = await execCommand(
    sandbox,
    'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --no-package-lock playwright@1.62.1',
    90,
    undefined,
    EVALUATOR_ROOT,
  )
  if (install.exitCode !== 0) throw new Error(`Could not prepare Playwright: ${install.result.slice(-500)}`)

  await onProgress?.('Capturing as much screenshot evidence as possible over the next 30 seconds...')
  // Daytona workspaces are not guaranteed to live under /root. The evaluator
  // lives next to `repo` under `workspace`, so address it relative to the
  // detected project root instead of assuming a container home directory.
  const evaluatorPathFromProject = `${'../'.repeat(projectRoot.split('/').length - 1)}evaluator/scout.mjs`
  const scan = await execCommand(
    sandbox,
    `rm -rf .trysdk-scout-output && node ${quoteShell(evaluatorPathFromProject)}`,
    45,
    {
      // The browser runs in the sandbox alongside Vite. Using localhost avoids
      // routing its own requests through the external preview proxy.
      APP_URL: `http://127.0.0.1:${port}`,
      // The scanner runs with projectRoot as its working directory, so this
      // must stay relative to that directory. Passing projectRoot again here
      // would create workspace/repo/workspace/repo/... instead.
      OUTPUT_DIR: '.trysdk-scout-output',
      PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright',
      PREVIEW_TOKEN: '',
    },
    projectRoot,
  )
  if (scan.exitCode !== 0) throw new Error(`Playwright scan failed: ${scan.result.slice(-500)}`)

  // Daytona's fs.downloadFile uses a multipart implementation that is not
  // bundle-safe in a Next server runtime. Read the small manifest and each
  // already-compressed screenshot through the sandbox process API instead.
  const manifestFile = await execCommand(sandbox, `cat ${quoteShell('.trysdk-scout-output/screens.json')}`, 30, undefined, projectRoot)
  if (manifestFile.exitCode !== 0) throw new Error(`Could not read screenshot manifest: ${manifestFile.result.slice(-500)}`)
  const manifest = JSON.parse(manifestFile.result) as CapturedScreen[]
  const screenshots = await Promise.all(manifest.slice(0, MAX_SCREENSHOTS).map(async screen => {
    const image = await execCommand(sandbox, `base64 < ${quoteShell(`.trysdk-scout-output/${screen.fileName}`)} | tr -d '\\n'`, 30, undefined, projectRoot)
    if (image.exitCode !== 0) throw new Error(`Could not read screenshot ${screen.fileName}: ${image.result.slice(-500)}`)
    return {
      route: screen.route,
      description: screen.description,
      base64: image.result,
      mimeType: 'image/jpeg' as const,
    }
  }))

  if (screenshots.length === 0) {
    const failuresFile = await execCommand(sandbox, `cat ${quoteShell('.trysdk-scout-output/failures.json')}`, 30, undefined, projectRoot)
    const failures = failuresFile.exitCode === 0
      ? JSON.parse(failuresFile.result) as Array<{ route: string; error: string }>
      : []
    const detail = failures[0]?.error ? `: ${failures[0].error}` : ''
    throw new Error(`Playwright could not capture a usable application screen${detail}`)
  }
  return screenshots
}
