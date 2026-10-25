import { NextResponse, type NextRequest } from 'next/server'

import { buildAgentsHeaders } from '@/lib/agents/headers'
import { getPythonAgentsUrl } from '@/lib/config'
import { requireProPlanApi } from '@/lib/pro-plan-api'

export const maxDuration = 180

const CONTEXT_HEADERS = [
  'x-chatkit-agent-thread-id',
  'x-chatkit-location-id',
  'x-chatkit-analytics-run-id',
  'x-chatkit-chat-mode',
  'x-chatkit-chat-model',
  'x-chatkit-generation-model',
  'x-chatkit-image-format',
  'x-chatkit-image-quality',
] as const

/**
 * Authenticated BFF proxy for OpenAI ChatKit protocol → apps/agents POST /chatkit.
 * Forwards ChatKit body as-is (JSON or SSE) and advisor shell context headers.
 */
export async function POST(request: NextRequest) {
  const auth = await requireProPlanApi()
  if (!auth.ok) return auth.response

  const agentsBase = getPythonAgentsUrl()
  if (!agentsBase) {
    return NextResponse.json({ error: 'Agents URL is not configured' }, { status: 503 })
  }

  const body = await request.arrayBuffer()
  const forwardHeaders: Record<string, string> = buildAgentsHeaders(auth.userId)
  for (const name of CONTEXT_HEADERS) {
    const value = request.headers.get(name)
    if (value) {
      forwardHeaders[name] = value
    }
  }
  // Preserve content-type from ChatKit client when present.
  const contentType = request.headers.get('content-type')
  if (contentType) {
    forwardHeaders['Content-Type'] = contentType
  }

  let upstream: Response
  try {
    upstream = await fetch(`${agentsBase.replace(/\/$/, '')}/chatkit`, {
      method: 'POST',
      headers: forwardHeaders,
      body,
      cache: 'no-store',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ChatKit upstream failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const mediaType = upstream.headers.get('content-type') || 'application/json'
  if (mediaType.includes('text/event-stream') && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': mediaType },
  })
}
