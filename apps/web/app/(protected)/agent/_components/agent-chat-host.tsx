'use client'

import { ChatProvider } from '@/components/chat/chat-context'

import { useAgentChat, type UseAgentChatOptions } from './use-agent-chat'
import type { ReactNode } from 'react'

export type AgentChatHostProps = UseAgentChatOptions & {
  children: ReactNode
}

export function AgentChatHost({ children, ...chatOptions }: AgentChatHostProps) {
  const { messagesState, composerState, actions } = useAgentChat(chatOptions)

  return (
    <ChatProvider messagesState={messagesState} composerState={composerState} actions={actions}>
      {children}
    </ChatProvider>
  )
}
