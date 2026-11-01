'use client'

import { CopilotChat } from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { AdvisorChatKitToolbar } from '@/components/chat/chatkit/advisor-chatkit-toolbar'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { AdvisorCopilotGenerativeUi } from '@/components/chat/copilotkit/advisor-copilot-generative-ui'
import { AdvisorCopilotHitl } from '@/components/chat/copilotkit/advisor-copilot-hitl'
import { apiFetch } from '@/lib/api/client-fetch'
import { createAgentThread, removeAgentThread } from '@/lib/chat/agent-thread-registry'

/**
 * Advisor conversation column powered by CopilotKit.
 * Keeps Menuyukti toolbar (mode / model / thread actions) above CopilotChat.
 */
export function AdvisorCopilotChat() {
  const shell = useAdvisorChatKitShell()
  const t = useTranslations('chat')

  const handleClearChat = useCallback(() => {
    const nextId = crypto.randomUUID()
    createAgentThread({
      id: nextId,
      locationId: shell.locationId,
      analyticsRunId: shell.analyticsRunId,
    })
    removeAgentThread(shell.agentThreadId)
    void apiFetch(`/api/chat/history?agentThreadId=${encodeURIComponent(shell.agentThreadId)}`, {
      method: 'DELETE',
    }).catch(() => undefined)
    shell.onThreadRotated?.(nextId)
  }, [shell])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AdvisorChatKitToolbar onClearChat={handleClearChat} />
      <AdvisorCopilotGenerativeUi />
      <AdvisorCopilotHitl />
      <div className="min-h-0 flex-1">
        <CopilotChat
          agentId="advisor"
          className="h-full"
          labels={{
            chatInputPlaceholder:
              shell.chatMode === 'image_assistant'
                ? t('placeholderImageAssistant')
                : t('placeholder'),
          }}
          threadId={shell.agentThreadId}
        />
      </div>
    </div>
  )
}
