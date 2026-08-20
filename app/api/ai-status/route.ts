export const runtime = 'nodejs'

export async function GET() {
  const provider = process.env.ARTEN_AI_PROVIDER || 'ollama'
  if (provider !== 'ollama') return Response.json({ provider, ready: Boolean(process.env.OPENROUTER_API_KEY), model: process.env.OPENROUTER_MODEL || 'openrouter/free' })
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  try {
    const response = await fetch(`${baseUrl.replace(/\/v1\/?$/, '')}/api/tags`, { cache: 'no-store', signal: AbortSignal.timeout(1800) })
    const data = await response.json()
    const models = Array.isArray(data?.models) ? data.models.map((model: { name?: string }) => model.name).filter(Boolean) : []
    return Response.json({ provider: 'ollama', ready: response.ok, model: process.env.OLLAMA_MODEL || models[0] || 'llama3.2:3b', models })
  } catch {
    return Response.json({ provider: 'ollama', ready: false, model: process.env.OLLAMA_MODEL || 'llama3.2:3b', models: [] })
  }
}
