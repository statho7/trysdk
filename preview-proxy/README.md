# Try SDK preview proxy

This Cloudflare Worker is the Daytona-supported solution for iframe previews. It keeps the Daytona preview token server-side and forwards each request with `X-Daytona-Skip-Preview-Warning: true`.

## One-time deployment

1. Create a Cloudflare Worker and deploy this directory: `cd preview-proxy && npm install && npx wrangler deploy`.
2. Add a wildcard custom domain route such as `*.preview.example.com/*`. The domain must be managed by Cloudflare because every preview has its own job-ID subdomain.
3. Add Worker secrets, using the same Upstash values as the Try SDK app:

   ```sh
   npx wrangler secret put UPSTASH_REDIS_REST_URL
   npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
   ```

4. In Vercel, set `NEXT_PUBLIC_PREVIEW_PROXY_DOMAIN=preview.example.com` for Try SDK and redeploy it.

Every new job then embeds `https://{job-id}.preview.example.com/`. The Worker looks up the job, injects the short-lived Daytona preview token, skips the warning page, and forwards HTTP/WebSocket requests to the Vite server.

The job record expires after two hours, so an old preview URL automatically stops resolving.
