'use client'

import type { UIMessage } from 'ai'
import { memo } from 'react'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import { Spinner } from '@workspace/ui/components/spinner'

import { getWorkflowMessageText } from './use-workflow-chat'
import { WorkflowChatMessageParts } from './workflow-chat-message-parts'

export type WorkflowChatMessageRowProps = {
  message: UIMessage
  isActiveStream: boolean
  thinkingLabel: string
}

function WorkflowChatMessageRowInner({
  message,
  isActiveStream,
  thinkingLabel,
}: WorkflowChatMessageRowProps) {
  const msgText = isActiveStream ? getWorkflowMessageText(message) : ''
  const showFallbackSpinner = isActiveStream && message.role === 'assistant' && msgText.length === 0

  return (
    <Message from={message.role}>
      <MessageContent>
        {showFallbackSpinner ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner />
            <span>{thinkingLabel}</span>
          </div>
        ) : (
          <WorkflowChatMessageParts
            isStreaming={isActiveStream}
            message={message}
            role={message.role}
          />
        )}
      </MessageContent>
    </Message>
  )
}

export const WorkflowChatMessageRow = memo(
  WorkflowChatMessageRowInner,
  (prev, next) =>
    prev.message === next.message &&
    prev.isActiveStream === next.isActiveStream &&
    prev.thinkingLabel === next.thinkingLabel,
)
