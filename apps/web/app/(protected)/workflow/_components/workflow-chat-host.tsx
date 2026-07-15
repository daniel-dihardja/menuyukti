'use client'

import { useEffect, useMemo, type ReactNode } from 'react'

import { WorkflowChatProvider } from './workflow-chat-context'
import { useWorkflowChat, type UseWorkflowChatOptions } from './use-workflow-chat'

export type WorkflowChatHostProps = Omit<
  UseWorkflowChatOptions,
  'onHydrateAfterChat' | 'onPrefetchMilestoneReference'
> & {
  onHydrateAfterChat: (milestoneId: string) => void
  onPrefetchMilestoneReference?: (milestoneId: string) => void
  onBusyChange: (isBusy: boolean) => void
  children: ReactNode
}

export function WorkflowChatHost({
  onBusyChange,
  children,
  ...chatOptions
}: WorkflowChatHostProps) {
  const { messagesState, composerState, actions } = useWorkflowChat(chatOptions)

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
