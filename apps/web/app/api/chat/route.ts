import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { UIMessage } from 'ai'
import { getPythonAgentsUrl } from '@/lib/config'
import { chatRequestBodySchema } from './schema'

// Streaming can run for a while (LLM + network).
export const maxDuration = 180

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function sseLine(data: object | '[DONE]'): string {
  return `data: ${data === '[DONE]' ? '[DONE]' : JSON.stringify(data)}\n\n`
}

const SSE_EVENT = {
  START: 'start',
  TEXT_START: 'text-start',
  TEXT_DELTA: 'text-delta',
  TEXT_END: 'text-end',
  FINISH: 'finish',
  ERROR: 'error',
} as const

const SSE_DONE = '[DONE]' as const

/** LangGraph checkpoint stores prior turns; each request sends only the latest user message. */
function lastUserMessageToPython(messages: UIMessage[]): Array<{ role: 'user'; content: string }> {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!
    if (m.role !== 'user') continue
    const text =
      m.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
    if (!text.trim()) continue
    return [{ role: 'user', content: text }]
  }
  return []
}

/** SSE lines from `apps/agents` POST /chat: `data: {"token":"..."}\\n\\n` */
interface PythonTokenChunk {
  token?: string
  error?: string
}

async function parsePythonSSEAndForward(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  textPartId: string,
  encoder: TextEncoder,
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      const remainder = lines.pop()
      buffer = remainder !== undefined ? remainder : ''
      for (const line of lines) {
        const match = line.match(/^data: (.+)$/m)
        const payload = match?.[1]?.trim()
        if (!payload) continue
        if (payload === SSE_DONE) continue
        try {
          const data = JSON.parse(payload) as PythonTokenChunk
          if (data.error) {
            controller.enqueue(
              encoder.encode(sseLine({ type: SSE_EVENT.ERROR, errorText: data.error })),
            )
            return
          }
          if (typeof data.token === 'string' && data.token.length > 0) {
            controller.enqueue(
              encoder.encode(
                sseLine({
                  type: SSE_EVENT.TEXT_DELTA,
                  id: textPartId,
                  delta: data.token,
                }),
              ),
            )
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function POST(req: Request) {
  await connection()
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) {
    return jsonError('Unauthorized', 401)
  }

  const baseUrl = getPythonAgentsUrl()

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const parsed = chatRequestBodySchema.safeParse(json)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid request body'
    return jsonError(message, 400)
  }

  const { messages: rawMessages, workflowId, milestoneId, locationId, agentThreadId } = parsed.data
  const messages = rawMessages as UIMessage[]

  if (workflowId === undefined && agentThreadId === undefined) {
    return jsonError('workflowId or agentThreadId is required', 400)
  }

  const pythonMessages = lastUserMessageToPython(messages)
  if (pythonMessages.length === 0) {
    return jsonError('No user message with text content found in request', 400)
  }

  let agentRes: Response
  try {
    agentRes = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Menuyukti-User-Id': userId,
      },
      body: JSON.stringify({
        messages: pythonMessages,
        ...(workflowId !== undefined ? { workflow_id: workflowId } : {}),
        ...(milestoneId !== undefined ? { milestone_id: milestoneId } : {}),
        ...(locationId !== undefined ? { location_id: Number(locationId) } : {}),
        ...(agentThreadId !== undefined ? { agent_thread_id: agentThreadId } : {}),
      }),
      signal: req.signal,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return jsonError(
      `Cannot connect to LangGraph agents at ${baseUrl} (${detail}). Start apps/agents (make dev, port 8001), set PYTHON_AGENTS_URL if needed, and prefer 127.0.0.1 over localhost if you see connection issues.`,
      502,
    )
  }

  if (!agentRes.ok) {
    const text = await agentRes.text()
    return jsonError(
      `Agents service error (${agentRes.status}): ${text || agentRes.statusText}`,
      502,
    )
  }

  const messageId = crypto.randomUUID()
  const textPartId = crypto.randomUUID()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.START, messageId })))
      controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.TEXT_START, id: textPartId })))

      const reader = agentRes.body?.getReader()
      if (!reader) {
        controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.TEXT_END, id: textPartId })))
        controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.FINISH })))
        controller.enqueue(encoder.encode(sseLine(SSE_DONE)))
        controller.close()
        return
      }

      await parsePythonSSEAndForward(reader, controller, textPartId, encoder)

      controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.TEXT_END, id: textPartId })))
      controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.FINISH })))
      controller.enqueue(encoder.encode(sseLine(SSE_DONE)))
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'x-vercel-ai-ui-message-stream': 'v1',
    },
  })
}
