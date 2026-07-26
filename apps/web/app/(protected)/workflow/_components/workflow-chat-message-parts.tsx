'use client'

import type { UIMessage } from 'ai'
import { useMemo } from 'react'

import { ChatMessageParts } from '@/components/chat-message-parts'
import { AUTO_ATTACHED_GENERATED_ID } from '@/lib/chat/workflow-chat-auto-attach'

import {
  useWorkflowChatActions,
  useWorkflowChatComposerState,
  useWorkflowChatMessages,
} from './workflow-chat-context'
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
  const { isChatBusy } = useWorkflowChatMessages()
  const { pendingMediaAttachments } = useWorkflowChatComposerState()
  const { handleAttachGeneratedImage } = useWorkflowChatActions()

  const attachedGeneratedImageName = useMemo(() => {
    const attached = pendingMediaAttachments.find((m) => m.id === AUTO_ATTACHED_GENERATED_ID)
    return attached?.name ?? null
  }, [pendingMediaAttachments])

  return (
    <ChatMessageParts
      attachedGeneratedImageName={attachedGeneratedImageName}
      generatedImageActionsDisabled={isChatBusy}
      isStreaming={isStreaming}
      mentionTitles={mentionTitles}
      message={message}
      onAttachGeneratedImage={handleAttachGeneratedImage}
      role={role}
    />
  )
}
