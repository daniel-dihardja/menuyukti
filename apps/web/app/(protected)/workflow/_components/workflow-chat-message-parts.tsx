'use client'

import type { UIMessage } from 'ai'

import { ChatMessageParts } from '@/components/chat-message-parts'

import { useWorkflowChatMentionTitles } from './workflow-chat-mention-context'

export function WorkflowChatMessageParts({
  message,
  role,
}: {
  message: UIMessage
  role: UIMessage['role']
}) {
  const mentionTitles = useWorkflowChatMentionTitles()
  return <ChatMessageParts mentionTitles={mentionTitles} message={message} role={role} />
}
