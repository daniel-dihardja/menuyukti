'use client'

import type { UIMessage } from 'ai'
import { useTranslations } from 'next-intl'
import { memo } from 'react'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { shouldShowAssistantThinkingFallback } from '@/lib/chat/should-show-assistant-thinking-fallback'
import type { AssistantTrailingThinkingState } from '@/lib/chat/should-show-assistant-trailing-thinking'
import type { StoryAssetRef } from '@/lib/chat/story-assets-from-messages'

import { ChatThreadMessageParts } from '@/components/chat/chat-message-parts'

const HIDDEN_TRAILING: AssistantTrailingThinkingState = { show: false, labelKey: 'thinking' }
const EMPTY_STORY_ASSETS: StoryAssetRef[] = []

export type ChatMessageRowProps = {
  message: UIMessage
  isActiveStream: boolean
  trailingThinking: AssistantTrailingThinkingState
  actionsEnabled: boolean
  confirmAssets: readonly StoryAssetRef[]
  /** Full thread only for the active stream row (image URL dedupe across messages). */
  threadMessages?: readonly UIMessage[]
}

function ChatMessageRowInner({
  message,
  isActiveStream,
  trailingThinking,
  actionsEnabled,
  confirmAssets,
  threadMessages,
}: ChatMessageRowProps) {
  const tChat = useTranslations('chat')
  const tWeeklySchedule = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const showFallbackSpinner = shouldShowAssistantThinkingFallback(message, isActiveStream)
  const trailingLabel =
    trailingThinking.labelKey === 'buildingWeeklyPlan'
      ? tWeeklySchedule('running')
      : tChat('thinking')
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
            <span>{tChat('thinking')}</span>
          </div>
        ) : (
          <>
            <ChatThreadMessageParts
              actionsEnabled={actionsEnabled}
              confirmAssets={confirmAssets}
              isStreaming={isActiveStream}
              message={message}
              role={message.role}
              threadMessages={threadMessages}
            />
            {trailingThinking.show ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Spinner aria-hidden />
                <span>{trailingLabel}</span>
              </div>
            ) : null}
          </>
        )}
      </MessageContent>
    </Message>
  )
}

export const ChatMessageRow = memo(ChatMessageRowInner, (prev, next) => {
  if (
    prev.message !== next.message ||
    prev.isActiveStream !== next.isActiveStream ||
    prev.trailingThinking.show !== next.trailingThinking.show ||
    prev.trailingThinking.labelKey !== next.trailingThinking.labelKey ||
    prev.actionsEnabled !== next.actionsEnabled ||
    prev.threadMessages !== next.threadMessages
  ) {
    return false
  }
  if (prev.confirmAssets === next.confirmAssets) return true
  if (prev.confirmAssets.length !== next.confirmAssets.length) return false
  return prev.confirmAssets.every(
    (asset, index) =>
      asset.name === next.confirmAssets[index]?.name &&
      asset.role === next.confirmAssets[index]?.role,
  )
})

export { EMPTY_STORY_ASSETS, HIDDEN_TRAILING }
