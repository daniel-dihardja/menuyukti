import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { UIMessage } from 'ai'
import { buildPythonUserMessage, ChatImageError } from '@/lib/chat/build-python-user-message'
import { formatPresetDataMarkdownSection } from '@/lib/chat/format-payload-for-chat'
import { formatVisualizationDataMarkdownSection } from '@/lib/chat/format-visualization-for-chat'
import { loadReferencedMilestonePresetForChat } from '@/lib/chat/referenced-milestone-for-chat'
import { loadReferencedVisualizationForChat } from '@/lib/chat/referenced-visualization-for-chat'
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
  TOOL_INPUT_START: 'tool-input-start',
  TOOL_INPUT_AVAILABLE: 'tool-input-available',
  TOOL_OUTPUT_AVAILABLE: 'tool-output-available',
} as const

const SSE_DONE = '[DONE]' as const

/** SSE lines from `apps/agents` POST /chat. */
interface PythonStreamChunk {
  token?: string
  error?: string
  status?: 'tool_start' | 'tool_end'
  tool?: string
}

type StreamForwardContext = {
  textPartId: string
  textStarted: boolean
  toolCallIds: Map<string, string>
}

function ensureTextStarted(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  ctx: StreamForwardContext,
): void {
  if (ctx.textStarted) {
    return
  }
  ctx.textStarted = true
  controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.TEXT_START, id: ctx.textPartId })))
}

function forwardToolStart(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  ctx: StreamForwardContext,
  toolName: string,
): void {
  const toolCallId = crypto.randomUUID()
  ctx.toolCallIds.set(toolName, toolCallId)
  controller.enqueue(
    encoder.encode(
      sseLine({
        type: SSE_EVENT.TOOL_INPUT_START,
        toolCallId,
        toolName,
      }),
    ),
  )
  controller.enqueue(
    encoder.encode(
      sseLine({
        type: SSE_EVENT.TOOL_INPUT_AVAILABLE,
        toolCallId,
        toolName,
        input: {},
      }),
    ),
  )
}

function forwardToolEnd(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  ctx: StreamForwardContext,
  toolName: string,
): void {
  const toolCallId = ctx.toolCallIds.get(toolName) ?? crypto.randomUUID()
  ctx.toolCallIds.delete(toolName)
  controller.enqueue(
    encoder.encode(
      sseLine({
        type: SSE_EVENT.TOOL_OUTPUT_AVAILABLE,
        toolCallId,
        output: '',
      }),
    ),
  )
}

async function parsePythonSSEAndForward(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  ctx: StreamForwardContext,
  encoder: TextEncoder,
  abortSignal: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      if (abortSignal.aborted) {
        await reader.cancel()
        return
      }
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
          const data = JSON.parse(payload) as PythonStreamChunk
          if (data.error) {
            controller.enqueue(
              encoder.encode(sseLine({ type: SSE_EVENT.ERROR, errorText: data.error })),
            )
            return
          }
          if (
            data.status === 'tool_start' &&
            typeof data.tool === 'string' &&
            data.tool.length > 0
          ) {
            forwardToolStart(controller, encoder, ctx, data.tool)
            continue
          }
          if (data.status === 'tool_end' && typeof data.tool === 'string' && data.tool.length > 0) {
            forwardToolEnd(controller, encoder, ctx, data.tool)
            continue
          }
          if (typeof data.token === 'string' && data.token.length > 0) {
            ensureTextStarted(controller, encoder, ctx)
            controller.enqueue(
              encoder.encode(
                sseLine({
                  type: SSE_EVENT.TEXT_DELTA,
                  id: ctx.textPartId,
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

  const {
    messages: rawMessages,
    workflowId,
    milestoneId,
    locationId,
    presetReferenceMilestoneId,
    referencedVisualizationId,
    referencedMediaNames,
    analyticsRunId,
    agentThreadId,
    workflowChatSessionId,
    model,
  } = parsed.data
  const messages = rawMessages as UIMessage[]

  if (workflowId === undefined && agentThreadId === undefined) {
    return jsonError('workflowId or agentThreadId is required', 400)
  }

  const referenceSections: string[] = []

  if (presetReferenceMilestoneId !== undefined || referencedVisualizationId !== undefined) {
    if (workflowId === undefined || locationId === undefined) {
      return jsonError(
        'Referenced milestone or visualization requires workflowId and locationId',
        400,
      )
    }
    const locationIdNum = Number(locationId)
    const analyticsRunIdNum = analyticsRunId !== undefined ? Number(analyticsRunId) : null

    const presetPromise =
      presetReferenceMilestoneId !== undefined
        ? loadReferencedMilestonePresetForChat(userId, {
            workflowId,
            locationId: locationIdNum,
            presetReferenceMilestoneId,
          }).catch((err: unknown) => {
            const detail = err instanceof Error ? err.message : String(err)
            throw new Error(`Failed to load referenced milestone: ${detail}`)
          })
        : Promise.resolve(null)

    const visualizationPromise =
      referencedVisualizationId !== undefined
        ? loadReferencedVisualizationForChat(userId, {
            workflowId,
            locationId: locationIdNum,
            referencedVisualizationId,
            analyticsRunId: analyticsRunIdNum,
          }).catch((err: unknown) => {
            const detail = err instanceof Error ? err.message : String(err)
            throw new Error(`Failed to load referenced visualization: ${detail}`)
          })
        : Promise.resolve(null)

    let presetLoaded: Awaited<ReturnType<typeof loadReferencedMilestonePresetForChat>> | null
    let visualizationLoaded: Awaited<ReturnType<typeof loadReferencedVisualizationForChat>> | null
    try {
      ;[presetLoaded, visualizationLoaded] = await Promise.all([
        presetPromise,
        visualizationPromise,
      ])
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      return jsonError(detail, 502)
    }

    if (presetLoaded !== null) {
      if (!presetLoaded.ok) {
        return jsonError(presetLoaded.message, presetLoaded.status)
      }
      referenceSections.push(
        formatPresetDataMarkdownSection(presetLoaded.title, presetLoaded.presetPayload),
      )
    }

    if (visualizationLoaded !== null) {
      if (!visualizationLoaded.ok) {
        return jsonError(visualizationLoaded.message, visualizationLoaded.status)
      }
      referenceSections.push(
        formatVisualizationDataMarkdownSection({
          title: visualizationLoaded.title,
          visualizationId: visualizationLoaded.visualizationId,
          payload: visualizationLoaded.payload,
          usedFallbackRun: visualizationLoaded.usedFallbackRun,
        }),
      )
    }
  }

  let pythonMessage: Awaited<ReturnType<typeof buildPythonUserMessage>>
  try {
    pythonMessage = await buildPythonUserMessage({
      messages,
      userId,
      referencedMediaNames,
      referenceTextSections: referenceSections,
    })
  } catch (err) {
    if (err instanceof ChatImageError) {
      return jsonError(err.message, err.status)
    }
    const detail = err instanceof Error ? err.message : String(err)
    return jsonError(detail, 400)
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
        messages: [pythonMessage],
        ...(workflowId !== undefined ? { workflow_id: workflowId } : {}),
        ...(milestoneId !== undefined ? { milestone_id: milestoneId } : {}),
        ...(locationId !== undefined ? { location_id: Number(locationId) } : {}),
        ...(agentThreadId !== undefined ? { agent_thread_id: agentThreadId } : {}),
        ...(workflowChatSessionId !== undefined
          ? { workflow_chat_session_id: workflowChatSessionId }
          : {}),
        ...(model !== undefined ? { model } : {}),
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
  const streamCtx: StreamForwardContext = {
    textPartId,
    textStarted: false,
    toolCallIds: new Map(),
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.START, messageId })))

      const reader = agentRes.body?.getReader()
      if (!reader) {
        if (streamCtx.textStarted) {
          controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.TEXT_END, id: textPartId })))
        }
        controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.FINISH })))
        controller.enqueue(encoder.encode(sseLine(SSE_DONE)))
        controller.close()
        return
      }

      try {
        await parsePythonSSEAndForward(reader, controller, streamCtx, encoder, req.signal)
        if (req.signal.aborted) {
          return
        }
        if (streamCtx.textStarted) {
          controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.TEXT_END, id: textPartId })))
        }
        controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.FINISH })))
        controller.enqueue(encoder.encode(sseLine(SSE_DONE)))
        controller.close()
      } catch (err) {
        if (req.signal.aborted) {
          try {
            controller.close()
          } catch {
            // stream may already be closed
          }
          return
        }
        throw err
      }
    },
    cancel() {
      void agentRes.body?.cancel()
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
