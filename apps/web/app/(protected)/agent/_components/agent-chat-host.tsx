'use client'

import { ChatProvider } from '@/components/chat/chat-context'

import { useAgentChat, type UseAgentChatOptions } from './use-agent-chat'
import type { ReactNode } from 'react'

export type AgentChatHostProps = UseAgentChatOptions & {
  children: ReactNode
}

export function AgentChatHost({ children, ...chatOptions }: AgentChatHostProps) {
  const { messagesState, metaState, composerState, storyAssetsState, actions } =
    useAgentChat(chatOptions)

  return (
    <ChatProvider
      actions={actions}
      composerState={composerState}
      messagesState={messagesState}
      metaState={metaState}
      storyAssetsState={storyAssetsState}
    >
      {children}
    </ChatProvider>
  )
}
