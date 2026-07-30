'use client'

import { useEffect, useMemo, type ReactNode } from 'react'

import { WorkflowChatProvider } from '@/app/(protected)/workflow/_components/workflow-chat-context'

import { useAgentChat, type UseAgentChatOptions } from './use-agent-chat'

export type AgentChatHostProps = UseAgentChatOptions & {
  onBusyChange: (isBusy: boolean) => void
  children: ReactNode
}

export function AgentChatHost({ onBusyChange, children, ...chatOptions }: AgentChatHostProps) {
  const { messagesState, composerState, actions } = useAgentChat(chatOptions)

  useEffect(() => {
    onBusyChange(messagesState.isChatBusy)
  }, [messagesState.isChatBusy, onBusyChange])

  const providerProps = useMemo(
    () => ({
      messagesState,
      composerState,
      actions,
    }),
    [messagesState, composerState, actions],
  )

  return <WorkflowChatProvider {...providerProps}>{children}</WorkflowChatProvider>
}
