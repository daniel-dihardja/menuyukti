'use client'

import { CopilotKit } from '@copilotkit/react-core/v2'
import type { ReactNode } from 'react'

import { buildAdvisorCopilotKitContextHeaders } from '@/lib/chat/copilotkit-context-headers'

type AdvisorCopilotKitProviderProps = {
  children: ReactNode
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
  chatMode: string
  selectedChatModel?: string
  selectedGenerationModel?: string
  selectedImageFormat?: string
}

/**
 * Mounts CopilotKit against `/api/copilotkit` with advisor context headers only
 * (no user id — identity is stamped by the BFF).
 */
export function AdvisorCopilotKitProvider({
  children,
  agentThreadId,
  locationId,
  analyticsRunId,
  chatMode,
  selectedChatModel,
  selectedGenerationModel,
  selectedImageFormat,
}: AdvisorCopilotKitProviderProps) {
  const headers = buildAdvisorCopilotKitContextHeaders({
    agentThreadId,
    locationId,
    analyticsRunId,
    chatMode,
    selectedChatModel,
    selectedGenerationModel,
    selectedImageFormat,
  })

  return (
    <CopilotKit headers={headers} runtimeUrl="/api/copilotkit">
      {children}
    </CopilotKit>
  )
}
