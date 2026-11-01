import { HttpAgent } from '@ag-ui/client'
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  InMemoryAgentRunner,
} from '@copilotkit/runtime/v2'
import { NextResponse, type NextRequest } from 'next/server'

import { buildAgentsHeaders } from '@/lib/agents/headers'
import { isChatImageAssistantEnabled, normalizeChatModeId } from '@/lib/chat/chat-modes'
import { COPILOTKIT_CONTEXT_HEADER_NAMES } from '@/lib/chat/copilotkit-context-headers'
import { checkAdvisorChatSpendLimits } from '@/lib/chat/enforce-chat-spend-limits'
import { getPythonAgentsUrl } from '@/lib/config'
import { requireProPlanApi } from '@/lib/pro-plan-api'

export const maxDuration = 180

/**
 * Authenticated Copilot Runtime → apps/agents AG-UI (`POST /copilotkit/advisor`).
 *
 * `X-Menuyukti-User-Id` is stamped from Clerk via `buildAgentsHeaders` on the
 * HttpAgent (server-configured headers win over any browser-forwarded value).
 */
async function handle(request: NextRequest): Promise<Response> {
  const auth = await requireProPlanApi()
  if (!auth.ok) return auth.response

  const spend = await checkAdvisorChatSpendLimits(auth.userId)
  if (!spend.ok) {
    return NextResponse.json({ error: spend.message }, { status: 429 })
  }

  const agentsBase = getPythonAgentsUrl()
  if (!agentsBase) {
    return NextResponse.json({ error: 'Agents URL is not configured' }, { status: 503 })
  }

  const rawChatMode = request.headers.get('x-menuyukti-chat-mode')
  const chatMode = rawChatMode ? normalizeChatModeId(rawChatMode) : null
  if (chatMode === 'image_assistant' && !isChatImageAssistantEnabled()) {
    return NextResponse.json({ error: 'Chat mode "image_assistant" is disabled' }, { status: 403 })
  }

  // Never copy identity from the browser; only allowlisted advisor context.
  const forwardAllow = [...COPILOTKIT_CONTEXT_HEADER_NAMES]

  const runtime = new CopilotRuntime({
    agents: {
      advisor: new HttpAgent({
        url: `${agentsBase.replace(/\/$/, '')}/copilotkit/advisor`,
        headers: buildAgentsHeaders(auth.userId),
      }),
    },
    runner: new InMemoryAgentRunner(),
    forwardHeaders: {
      allow: forwardAllow,
    },
  })

  const handler = createCopilotRuntimeHandler({
    runtime,
    basePath: '/api/copilotkit',
    mode: 'single-route',
  })

  return handler(request)
}

export const POST = handle
export const GET = handle
