import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { UIMessage } from 'ai'
import { buildPythonUserMessage, ChatImageError } from '@/lib/chat/build-python-user-message'
import { formatVisualizationDataMarkdownSection } from '@/lib/chat/format-visualization-for-chat'
import { loadReferencedVisualizationForChat } from '@/lib/chat/referenced-visualization-for-chat'
import { buildAgentsHeaders } from '@/lib/agents/headers'
import { getPythonAgentsUrl } from '@/lib/config'
import { pushPendingToolCallId, resolveToolEndCallId } from '@/lib/chat/pending-tool-call-ids'
import { pythonStreamErrorText } from '@/lib/chat/python-stream-error'
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
  error?: string | boolean
  message?: string
  status?: 'tool_start' | 'tool_end'
  tool?: string
  /** LangChain tool call id — required when the same tool runs multiple times in one turn. */
  tool_call_id?: string
  output?: string
}

type StreamForwardContext = {
  textPartId: string
  textStarted: boolean
  /**
   * Pending tool-call ids keyed by tool name (FIFO). Used when agents omit tool_call_id
   * (legacy / slash shortcuts). Prefer explicit tool_call_id from the agents SSE when present.
   */
  pendingToolCallIdsByName: Map<string, string[]>
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
  toolCallIdFromAgents?: string,
): void {
  const toolCallId =
    typeof toolCallIdFromAgents === 'string' && toolCallIdFromAgents.trim()
      ? toolCallIdFromAgents.trim()
      : crypto.randomUUID()
  pushPendingToolCallId(ctx.pendingToolCallIdsByName, toolName, toolCallId)
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
  output: string = '',
  toolCallIdFromAgents?: string,
): void {
  const toolCallId = resolveToolEndCallId(
    ctx.pendingToolCallIdsByName,
    toolName,
    toolCallIdFromAgents,
    crypto.randomUUID(),
  )
  controller.enqueue(
    encoder.encode(
      sseLine({
        type: SSE_EVENT.TOOL_OUTPUT_AVAILABLE,
        toolCallId,
        output,
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
              encoder.encode(
                sseLine({ type: SSE_EVENT.ERROR, errorText: pythonStreamErrorText(data) }),
              ),
            )
            return
          }
          if (
            data.status === 'tool_start' &&
            typeof data.tool === 'string' &&
            data.tool.length > 0
          ) {
            forwardToolStart(controller, encoder, ctx, data.tool, data.tool_call_id)
            continue
          }
          if (data.status === 'tool_end' && typeof data.tool === 'string' && data.tool.length > 0) {
            const output = typeof data.output === 'string' ? data.output : ''
            forwardToolEnd(controller, encoder, ctx, data.tool, output, data.tool_call_id)
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
    locationId,
    referencedVisualizationId,
    referencedMediaNames,
    referencedPostMediaNames,
    analyticsRunId,
    agentThreadId,
    chatMode,
    model,
    postId,
    pageId,
    generationModel,
    imageFormat,
    imageQuality,
    styleId,
    generationReferences,
    storyAssetAction,
  } = parsed.data
  const messages = rawMessages as UIMessage[]

  const actionOnly = storyAssetAction !== undefined && messages.length === 0

  if (!actionOnly && messages.length === 0) {
    return jsonError('messages or storyAssetAction is required', 400)
  }

  const referenceSections: string[] = []

  if (referencedVisualizationId !== undefined) {
    if (locationId === undefined) {
      return jsonError('Referenced visualization requires locationId', 400)
    }
    const locationIdNum = Number(locationId)
    const analyticsRunIdNum = analyticsRunId !== undefined ? Number(analyticsRunId) : null

    let visualizationLoaded: Awaited<ReturnType<typeof loadReferencedVisualizationForChat>>
    try {
      visualizationLoaded = await loadReferencedVisualizationForChat(userId, {
        locationId: locationIdNum,
        referencedVisualizationId,
        analyticsRunId: analyticsRunIdNum,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      return jsonError(`Failed to load referenced visualization: ${detail}`, 502)
    }

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

  let pythonMessage: Awaited<ReturnType<typeof buildPythonUserMessage>> | null = null
  if (!actionOnly) {
    try {
      pythonMessage = await buildPythonUserMessage({
        messages,
        userId,
        referencedMediaNames,
        referencedPostMediaNames,
        referenceTextSections: referenceSections,
      })
    } catch (err) {
      if (err instanceof ChatImageError) {
        return jsonError(err.message, err.status)
      }
      const detail = err instanceof Error ? err.message : String(err)
      return jsonError(detail, 400)
    }
  }

  let agentRes: Response
  try {
    agentRes = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: buildAgentsHeaders(userId),
      body: JSON.stringify({
        messages: pythonMessage !== null ? [pythonMessage] : [],
        ...(locationId !== undefined ? { location_id: Number(locationId) } : {}),
        ...(analyticsRunId !== undefined ? { analytics_run_id: Number(analyticsRunId) } : {}),
        agent_thread_id: agentThreadId,
        ...(chatMode !== undefined ? { chat_mode: chatMode } : {}),
        ...(model !== undefined ? { model } : {}),
        ...(postId !== undefined ? { post_id: postId } : {}),
        ...(pageId !== undefined ? { page_id: pageId } : {}),
        ...(generationModel !== undefined ? { generation_model: generationModel } : {}),
        ...(imageFormat !== undefined ? { image_format: imageFormat } : {}),
        ...(imageQuality !== undefined ? { image_quality: imageQuality } : {}),
        ...(styleId !== undefined ? { style_id: styleId } : {}),
        ...(generationReferences !== undefined
          ? { generation_references: generationReferences }
          : {}),
        ...(storyAssetAction !== undefined ? { story_asset_action: storyAssetAction } : {}),
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
    pendingToolCallIdsByName: new Map(),
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
