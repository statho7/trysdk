import { getJob } from '@/lib/jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Context = { params: Promise<{ jobId: string; path?: string[] }> }

async function proxyPreview(request: Request, { params }: Context): Promise<Response> {
  const { jobId, path = [] } = await params
  const job = await getJob(jobId)
  if (!job?.previewProxyUrl || !job.previewProxyToken) {
    return Response.json({ error: 'This preview has expired or is unavailable.' }, { status: 404 })
  }

  const upstream = new URL(job.previewProxyUrl)
  upstream.pathname = `/${path.join('/')}`
  upstream.search = new URL(request.url).search

  const headers = new Headers(request.headers)
  headers.set('X-Daytona-Preview-Token', job.previewProxyToken)
  headers.set('X-Daytona-Skip-Preview-Warning', 'true')
  headers.set('X-Forwarded-Host', new URL(request.url).host)
  headers.set('X-Daytona-Trust-Forwarded-Host', 'true')
  headers.delete('host')

  const upstreamResponse = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  })

  const responseHeaders = new Headers(upstreamResponse.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')
  responseHeaders.set('Cache-Control', 'no-store')
  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders })
}

export const GET = proxyPreview
export const HEAD = proxyPreview
