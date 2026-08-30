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
  // Supported adapters are started with this exact base path. Preserve it at
  // the upstream too: sending `/` causes base-aware dev servers to redirect.
  const basePath = `/api/preview/${jobId}`
  upstream.pathname = `${basePath}/${path.join('/')}`
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
  // Static sites commonly use root-relative assets. They do not know their
  // preview is mounted under a Try SDK route, so prefix those URLs for the iframe.
  if (job.framework === 'static' && upstreamResponse.headers.get('content-type')?.includes('text/html')) {
    const base = `/api/preview/${jobId}/`
    const html = (await upstreamResponse.text()).replace(/\b(href|src|action)=(['"])\/(?!\/)/gi, `$1=$2${base}`)
    return new Response(html, { status: upstreamResponse.status, headers: responseHeaders })
  }
  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders })
}

export const GET = proxyPreview
export const HEAD = proxyPreview
