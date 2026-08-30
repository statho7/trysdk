import type { EvalResult, Feature, Screenshot } from './types'

// TODO: Replace this entire file with real Vercel AI Gateway calls using:
//   import { generateText } from 'ai'
//   model: 'anthropic/claude-sonnet-4.6'
//   Auth: VERCEL_OIDC_TOKEN (run `vercel env pull .env.local`)
//
// Per-screenshot call:
//   generateText({ model: 'anthropic/claude-sonnet-4.6', messages: [{ role: 'user', content: [
//     { type: 'image', image: Buffer.from(screenshot.base64, 'base64'), mimeType: 'image/png' },
//     { type: 'text', text: `Use case: ${useCase}\nRoute: ${screenshot.route}\n...` }
//   ]}]})
//
// Aggregation call: all per-screenshot notes → final EvalResult JSON

export async function evaluateScreenshots(
  useCase: string,
  screenshots: Screenshot[]
): Promise<EvalResult> {
  // TODO: Remove mock data and implement real Claude vision calls
  await new Promise(resolve => setTimeout(resolve, 1500)) // simulate latency

  const mockFeatures: Feature[] = [
    { name: 'User authentication', found: true, notes: 'Login and signup flows visible on /login route' },
    { name: 'Dashboard / main view', found: true, notes: 'Clean dashboard with data visualizations' },
    { name: 'Multi-tenancy', found: false, notes: 'No organization switcher or tenant isolation visible' },
    { name: 'REST API', found: true, notes: 'API routes detected from navigation structure' },
    { name: 'Role-based access control', found: false, notes: 'No permission or role UI found' },
    { name: 'Data export', found: true, notes: 'Export buttons visible in the main data view' },
  ]

  const mockScreenshots: Screenshot[] = screenshots.length > 0
    ? screenshots
    : [
        { route: '/', description: 'Landing page with hero section', base64: '' },
        { route: '/login', description: 'Login form with email/password', base64: '' },
        { route: '/dashboard', description: 'Main dashboard with charts', base64: '' },
      ]

  return {
    jobId: '',
    fitScore: 6,
    summary:
      'This repository provides a solid foundation for the described use case. Authentication and core dashboard functionality are present, but multi-tenancy and role-based access control are missing and would need to be built from scratch.',
    features: mockFeatures,
    screenshots: mockScreenshots,
    verdict: 'Partial fit — strong core, gaps in multi-tenant features',
    caveats: [
      'Multi-tenancy would require significant architectural changes',
      'No built-in billing or subscription management',
      'RBAC must be implemented from scratch',
    ],
  }
}
