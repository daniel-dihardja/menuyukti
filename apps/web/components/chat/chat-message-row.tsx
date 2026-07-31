'use client'

import type { UIMessage } from 'ai'
import { memo } from 'react'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import { Spinner } from '@workspace/ui/components/spinner'

import { shouldShowAssistantThinkingFallback } from '@/lib/chat/should-show-assistant-thinking-fallback'

import { ChatThreadMessageParts } from '@/components/chat/chat-message-parts'

export type ChatMessageRowProps = {
  message: UIMessage
  isActiveStream: boolean
  thinkingLabel: string
}

function ChatMessageRowInner({ message, isActiveStream, thinkingLabel }: ChatMessageRowProps) {
  const showFallbackSpinner = shouldShowAssistantThinkingFallback(message, isActiveStream)

  return (
    <Message
      className="[content-visibility:auto] [contain-intrinsic-size:0_5rem]"
      from={message.role}
    >
      <MessageContent>
        {showFallbackSpinner ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner />
            <span>{thinkingLabel}</span>
          </div>
        ) : (
          <ChatThreadMessageParts
            isStreaming={isActiveStream}
            message={message}
            role={message.role}
          />
        )}
      </MessageContent>
    </Message>
  )
}

export const ChatMessageRow = memo(
  ChatMessageRowInner,
  (prev, next) =>
    prev.message === next.message &&
    prev.isActiveStream === next.isActiveStream &&
    prev.thinkingLabel === next.thinkingLabel,
)
