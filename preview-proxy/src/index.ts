export interface Env {
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
}

type PreviewJob = {
  previewProxyUrl?: string
  previewProxyToken?: string
}

function jobIdFromHost(host: string): string | null {
  const [jobId] = host.split('.')
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(jobId) ? jobId : null
}

async function getPreviewJob(env: Env, jobId: string): Promise<PreviewJob | null> {
  const key = encodeURIComponent(`job:${jobId}`)
  const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
  })
  if (!response.ok) return null
  const payload = await response.json() as { result?: PreviewJob | string | null }
  if (!payload.result) return null
  return typeof payload.result === 'string' ? JSON.parse(payload.result) as PreviewJob : payload.result
}

const previewProxy = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const jobId = jobIdFromHost(new URL(request.url).hostname)
    if (!jobId) return new Response('Unknown preview.', { status: 404 })

    const job = await getPreviewJob(env, jobId)
    if (!job?.previewProxyUrl || !job.previewProxyToken) {
      return new Response('This preview has expired or is unavailable.', { status: 404 })
    }

    const incoming = new URL(request.url)
    const upstream = new URL(job.previewProxyUrl)
    upstream.pathname = incoming.pathname
    upstream.search = incoming.search

    const headers = new Headers(request.headers)
    headers.set('X-Daytona-Preview-Token', job.previewProxyToken)
    headers.set('X-Daytona-Skip-Preview-Warning', 'true')
    headers.set('X-Forwarded-Host', incoming.host)
    headers.set('X-Daytona-Trust-Forwarded-Host', 'true')
    headers.delete('host')

    return fetch(new Request(upstream, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    }))
  },
}

export default previewProxy
