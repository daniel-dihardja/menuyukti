'use client'

import type { ReactNode } from 'react'

import { AdvisorCoAgentStateSync } from '@/components/chat/copilotkit/advisor-coagent-state-sync'
import { AdvisorCopilotKitProvider } from '@/components/chat/copilotkit/advisor-copilotkit-provider'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'

/** Wraps children in CopilotKit with shell context headers (no client user id). */
export function AdvisorCopilotKitShellBridge({ children }: { children: ReactNode }) {
  const shell = useAdvisorChatKitShell()
  return (
    <AdvisorCopilotKitProvider
      agentThreadId={shell.agentThreadId}
      analyticsRunId={shell.analyticsRunId}
      chatMode={shell.chatMode}
      locationId={shell.locationId}
      selectedChatModel={shell.selectedChatModel}
      selectedGenerationModel={shell.selectedGenerationModel}
      selectedImageFormat={shell.selectedImageFormat}
    >
      <AdvisorCoAgentStateSync />
      {children}
    </AdvisorCopilotKitProvider>
  )
}
