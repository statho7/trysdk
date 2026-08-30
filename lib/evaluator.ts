import { generateText } from 'ai'
import { createGateway } from '@ai-sdk/gateway'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import type { EvalResult, Screenshot } from './types'

const evaluationSchema = z.object({
  fitScore: z.number().int().min(1).max(10),
  summary: z.string(),
  features: z.array(z.object({
    name: z.string(),
    found: z.boolean(),
    notes: z.string(),
  })).min(3).max(8),
  verdict: z.string(),
  caveats: z.array(z.string()).max(6),
})

function parseEvaluation(text: string): z.infer<typeof evaluationSchema> {
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace < firstBrace) {
    throw new Error('Gemini returned no JSON evaluation report')
  }

  try {
    return evaluationSchema.parse(JSON.parse(text.slice(firstBrace, lastBrace + 1)))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini returned an invalid evaluation report: ${detail}`)
  }
}

export async function evaluateScreenshots(
  useCase: string,
  screenshots: Screenshot[],
  gatewayApiKey?: string,
): Promise<EvalResult> {
  const evidence = screenshots.map((screenshot, index) => ({
    type: 'file' as const,
    data: { type: 'data' as const, data: Buffer.from(screenshot.base64, 'base64') },
    mediaType: screenshot.mimeType,
    filename: `screen-${index + 1}.jpg`,
  }))

  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const model = googleApiKey
    ? createGoogleGenerativeAI({ apiKey: googleApiKey })('gemini-3.7-flash')
    : gatewayApiKey
      ? createGateway({ apiKey: gatewayApiKey })('google/gemini-3.7-flash')
      : 'google/gemini-3.7-flash'

  const { text } = await generateText({
    // A Vercel deployment supplies its short-lived OIDC credential on the
    // incoming request header. Using a per-request Gateway instance keeps
    // that credential out of persistent job data and makes the background
    // evaluation work after the route response has been returned.
    model,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: `Evaluate whether this running open-source application fits the user's goal.\n\nGoal: ${useCase}\n\nScreenshot evidence (in order):\n${screenshots.map((s, i) => `${i + 1}. ${s.route} — ${s.description}`).join('\n')}\n\nReport only what the screenshots support. Treat unobserved capabilities as unverified, not missing. Identify the most important visible gaps and the work needed to close them. Return only a valid JSON object (no Markdown) with this exact shape:\n{"fitScore":1,"summary":"string","features":[{"name":"string","found":true,"notes":"string"}],"verdict":"string","caveats":["string"]}\nfitScore must be an integer from 1 through 10. Include 3 to 8 features and at most 6 caveats.`,
      }, ...evidence],
    }],
  })

  const output = parseEvaluation(text)

  return {
    jobId: '',
    ...output,
    screenshots,
  }
}
