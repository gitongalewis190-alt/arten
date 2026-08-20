import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'nodejs'

function fallbackReply(messages: unknown[]) {
  const last = messages.at(-1)
  const text = typeof last === 'object' && last !== null && 'content' in last ? String(last.content) : ''
  if (/who are you|what is arten/i.test(text)) return 'I’m ARTEN, a calm intelligence workspace for shaping ideas into clear next steps, drafts, plans, and useful artifacts.'
  if (/plan|project|roadmap/i.test(text)) return 'I can help turn that into a plan. Start with the outcome, the constraints, and the next decision you need to make.'
  if (/summarize|summary/i.test(text)) return 'Paste the text or attach a document and I’ll turn it into a concise summary with the key points and next actions.'
  return `I’m ready to help with “${text}”. Tell me the outcome you want, and I’ll help shape it into a practical next step.`
}

export async function POST(request: Request) {
  const body = await request.json()
  const messages = Array.isArray(body?.messages) ? body.messages : []

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(fallbackReply(messages), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-ARTEN-Fallback': 'true' } })
  }

  const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ARTEN Intelligence Workspace',
    },
  })

  const result = streamText({
    model: openrouter(process.env.OPENROUTER_MODEL || 'openrouter/free'),
    system: 'You are ARTEN, a calm and capable intelligence workspace. Be concise, thoughtful, and practical. Help the user turn ideas into clear next steps, drafts, plans, or useful artifacts. Do not claim to have completed actions you cannot perform.',
    messages,
    abortSignal: request.signal,
  })

  return result.toTextStreamResponse()
}
