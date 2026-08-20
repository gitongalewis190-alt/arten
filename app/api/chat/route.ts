import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'nodejs'

function fallbackReply(messages: unknown[]) {
  const last = messages.at(-1)
  const text = typeof last === 'object' && last !== null && 'content' in last ? String(last.content).trim() : ''
  const lower = text.toLowerCase()
  const prior = messages.slice(-5).filter((item) => typeof item === 'object' && item !== null && 'content' in item).map((item) => String(item.content)).join(' ')
  if (!text) return 'I’m here. Give me a question, an idea, or a decision you’re working through.'
  if (/who are you|what is arten|what can you do/i.test(text)) return 'I’m ARTEN — a calm intelligence workspace. I help you clarify messy thoughts, make plans, draft useful work, and turn conversations into next actions.'
  if (/summarize|summary|tl;dr|key points/i.test(lower)) return `Here’s the useful shape I can extract from this: the central idea is “${text.replace(/summarize|summary|tl;dr/gi, '').trim()}”. The next step is to separate the main decision, supporting details, and anything that still needs evidence.`
  if (/plan|project|roadmap|build|launch/i.test(lower)) return `Let’s make this actionable. For “${text}”, I’d structure the work as: 1) define the outcome and audience, 2) choose the smallest useful version, 3) list constraints and dependencies, 4) create the first concrete deliverable, and 5) review what changed. The immediate next move is to write the outcome in one sentence.`
  if (/decide|decision|choose|should i|compare/i.test(lower)) return `I’d frame this decision around three things: the result you want, the risk you can tolerate, and the option that preserves the most flexibility. Based on “${text}”, write down the two alternatives and one deal-breaker for each before choosing.`
  if (/write|draft|email|brief|copy|rewrite/i.test(lower)) return `A strong first draft for this should be clear before it is clever. Start with the reader’s situation, state the point early, add only the context needed to act, and end with one specific next step. I can shape it further if you share the audience and tone.`
  if (/hello|hi|hey/i.test(lower)) return 'Good to see you. What are you trying to make clearer, decide, or move forward today?'
  return `I’m thinking about “${text}” in context of our conversation: ${prior.slice(0, 180)}. My read is that the useful next step is to make the desired outcome explicit, then reduce the work to one small action you can complete now.`
}

export async function POST(request: Request) {
  const body = await request.json()
  const messages = Array.isArray(body?.messages) ? body.messages : []

  const provider = process.env.ARTEN_AI_PROVIDER || 'ollama'
  const ollama = createOpenAI({
    apiKey: process.env.OLLAMA_API_KEY || 'ollama',
    baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
  })

  if (provider === 'ollama') {
    try {
      const health = await fetch(`${(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/v1\/?$/, '')}/api/tags`, { cache: 'no-store', signal: AbortSignal.timeout(1800) })
      if (!health.ok) throw new Error('Ollama is not ready')
      const result = streamText({
        model: ollama(process.env.OLLAMA_MODEL || 'llama3.2:3b'),
        system: 'You are ARTEN, a calm and capable intelligence workspace. Be thoughtful, practical, concise, and honest. Help turn ideas into clear next steps, drafts, plans, or useful artifacts. Do not claim actions you did not perform.',
        messages,
        abortSignal: request.signal,
      })
      return result.toTextStreamResponse()
    } catch {
      return new Response(fallbackReply(messages), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-ARTEN-Fallback': 'true', 'X-ARTEN-Provider': 'local-fallback' } })
    }
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(fallbackReply(messages), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-ARTEN-Fallback': 'true', 'X-ARTEN-Provider': 'local-fallback' } })
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
