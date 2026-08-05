'use client'

import type { UIMessage } from 'ai'
import { memo } from 'react'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { shouldShowAssistantThinkingFallback } from '@/lib/chat/should-show-assistant-thinking-fallback'
import { shouldShowAssistantTrailingThinking } from '@/lib/chat/should-show-assistant-trailing-thinking'

import { ChatThreadMessageParts } from '@/components/chat/chat-message-parts'

export type ChatMessageRowProps = {
  message: UIMessage
  isActiveStream: boolean
  thinkingLabel: string
}

function ChatMessageRowInner({ message, isActiveStream, thinkingLabel }: ChatMessageRowProps) {
  const showFallbackSpinner = shouldShowAssistantThinkingFallback(message, isActiveStream)
  const showTrailingSpinner = shouldShowAssistantTrailingThinking(message, isActiveStream)
  const isAssistant = message.role === 'assistant'

  return (
    <Message
      className="[content-visibility:auto] [contain-intrinsic-size:0_5rem]"
      from={message.role}
    >
      <MessageContent className={cn(isAssistant && 'w-full max-w-full')}>
        {showFallbackSpinner ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner aria-hidden />
            <span>{thinkingLabel}</span>
          </div>
        ) : (
          <>
            <ChatThreadMessageParts
              isStreaming={isActiveStream}
              message={message}
              role={message.role}
            />
            {showTrailingSpinner ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Spinner aria-hidden />
                <span>{thinkingLabel}</span>
              </div>
            ) : null}
          </>
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
