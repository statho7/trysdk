// This script runs INSIDE the Daytona sandbox — not in Node.js locally.
// Executed via: tsx /workspace/scout.ts
// Required env: APP_URL, OUTPUT_DIR, PREVIEW_TOKEN (for x-daytona-preview-token header)
//
// TODO: Uncomment the real implementation below once Playwright execution in sandbox is wired up.

// import { chromium } from 'playwright'
// import { writeFileSync, mkdirSync } from 'fs'
// import { join } from 'path'
//
// const APP_URL = process.env.APP_URL!
// const OUTPUT_DIR = process.env.OUTPUT_DIR ?? '/tmp/shots'
// const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN ?? ''
//
// const ROUTES = ['/', '/products', '/admin', '/login', '/shop', '/dashboard', '/settings', '/users']
//
// async function main() {
//   mkdirSync(OUTPUT_DIR, { recursive: true })
//   const browser = await chromium.launch()
//   const context = await browser.newContext({
//     extraHTTPHeaders: { 'x-daytona-preview-token': PREVIEW_TOKEN },
//   })
//   const page = await context.newPage()
//
//   const taken: { route: string; filePath: string }[] = []
//
//   for (const route of ROUTES) {
//     try {
//       const url = `${APP_URL}${route}`
//       const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 })
//       if (!res || res.status() === 404) continue
//
//       const slug = route.replace(/\//g, '_').replace(/^_/, '') || 'root'
//       const filePath = join(OUTPUT_DIR, `${slug}.png`)
//       await page.screenshot({ path: filePath, fullPage: true })
//       taken.push({ route, filePath })
//     } catch {
//       // skip routes that time out or error
//     }
//   }
//
//   writeFileSync(join(OUTPUT_DIR, 'routes.json'), JSON.stringify(taken, null, 2))
//   await browser.close()
// }
//
// main().catch(err => { console.error(err); process.exit(1) })

console.log('scout.playwright.ts stub — real implementation is TODO')
process.exit(0)
