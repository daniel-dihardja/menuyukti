'use client'

import type { UIMessage } from 'ai'

import { ChatMessageParts } from '@/components/chat-message-parts'

import { useWorkflowChatMentionTitles } from './workflow-chat-mention-context'

export function WorkflowChatMessageParts({
  message,
  role,
  isStreaming,
}: {
  message: UIMessage
  role: UIMessage['role']
  isStreaming?: boolean
}) {
  const mentionTitles = useWorkflowChatMentionTitles()

  return (
    <ChatMessageParts
      isStreaming={isStreaming}
      mentionTitles={mentionTitles}
      message={message}
      role={role}
    />
  )
}
