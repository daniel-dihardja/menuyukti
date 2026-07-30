import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { buildAgentsHeaders } from '@/lib/agents/headers'
import { getPythonAgentsUrl } from '@/lib/config'

const uuidSchema = z.string().uuid()

const agentThreadQuerySchema = z.object({
  agentThreadId: uuidSchema,
})

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function agentsFetchError(
  agentRes: Response,
  text: string,
): Promise<ReturnType<typeof jsonError>> {
  let message = `Agents error (${agentRes.status})`
  try {
    const errJson = JSON.parse(text) as { detail?: unknown }
    if (typeof errJson.detail === 'string') {
      message = errJson.detail
    }
  } catch {
    if (text) message = text
  }
  return jsonError(message, agentRes.status >= 500 ? 502 : 400)
}

export async function GET(req: Request) {
  await connection()
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return jsonError('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const parsed = agentThreadQuerySchema.safeParse({
    agentThreadId: url.searchParams.get('agentThreadId') ?? '',
  })
  if (!parsed.success) {
    return jsonError('Invalid query parameters', 400)
  }

  const baseUrl = getPythonAgentsUrl()
  const agentsUrl = new URL(`${baseUrl}/chat/history`)
  agentsUrl.searchParams.set('agent_thread_id', parsed.data.agentThreadId)

  let agentRes: Response
  try {
    agentRes = await fetch(agentsUrl, {
      method: 'GET',
      headers: buildAgentsHeaders(userId),
      signal: req.signal,
      cache: 'no-store',
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return jsonError(
      `Cannot connect to agents at ${baseUrl} (${detail}). Start apps/agents (make dev, port 8001) and set PYTHON_AGENTS_URL if needed.`,
      502,
    )
  }

  const text = await agentRes.text()
  if (!agentRes.ok) {
    return agentsFetchError(agentRes, text)
  }

  try {
    const data = JSON.parse(text) as {
      thread_id?: string
      messages?: unknown
      story_assets?: unknown
    }
    if (!Array.isArray(data.messages)) {
      return jsonError('Invalid agents response', 502)
    }
    return NextResponse.json({
      threadId: typeof data.thread_id === 'string' ? data.thread_id : null,
      messages: data.messages,
      storyAssets: Array.isArray(data.story_assets) ? data.story_assets : [],
    })
  } catch {
    return jsonError('Invalid agents response', 502)
  }
}

/** Delete LangGraph chat checkpoints for an agent thread. */
export async function DELETE(req: Request) {
  await connection()
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return jsonError('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const parsed = agentThreadQuerySchema.safeParse({
    agentThreadId: url.searchParams.get('agentThreadId') ?? '',
  })
  if (!parsed.success) {
    return jsonError('Invalid query parameters', 400)
  }

  const baseUrl = getPythonAgentsUrl()
  const agentsUrl = new URL(`${baseUrl}/chat/history`)
  agentsUrl.searchParams.set('agent_thread_id', parsed.data.agentThreadId)

  let agentRes: Response
  try {
    agentRes = await fetch(agentsUrl, {
      method: 'DELETE',
      headers: buildAgentsHeaders(userId),
      signal: req.signal,
      cache: 'no-store',
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return jsonError(
      `Cannot connect to agents at ${baseUrl} (${detail}). Start apps/agents (make dev, port 8001) and set PYTHON_AGENTS_URL if needed.`,
      502,
    )
  }

  const text = await agentRes.text()
  if (!agentRes.ok) {
    return agentsFetchError(agentRes, text)
  }

  try {
    const data = JSON.parse(text) as {
      deleted_thread_ids?: unknown
      count?: unknown
    }
    const deletedThreadIds = Array.isArray(data.deleted_thread_ids)
      ? data.deleted_thread_ids.filter((id): id is string => typeof id === 'string')
      : []
    return NextResponse.json({
      deletedThreadIds,
      count: typeof data.count === 'number' ? data.count : deletedThreadIds.length,
    })
  } catch {
    return jsonError('Invalid agents response', 502)
  }
}
