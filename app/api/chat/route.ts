import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 503 })
  }

  const body = await request.json()
  const messages = Array.isArray(body?.messages) ? body.messages : []

  const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ARTEN Intelligence Workspace',
    },
  })

  const result = streamText({
    model: openrouter(process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'),
    system: 'You are ARTEN, a calm and capable intelligence workspace. Be concise, thoughtful, and practical. Help the user turn ideas into clear next steps, drafts, plans, or useful artifacts. Do not claim to have completed actions you cannot perform.',
    messages,
    abortSignal: request.signal,
  })

  return result.toTextStreamResponse()
}
