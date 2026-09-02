'use client'

import type { UIMessage } from 'ai'
import { Suggestion, Suggestions } from '@workspace/ui/components/ai-elements/suggestion'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

import { ChatMessageParts as SharedChatMessageParts } from '@/components/chat-message-parts'
import type { StoryAssetRef } from '@/lib/chat/story-assets-from-messages'
import {
  messageHasGenerateInstagramPostImage,
  STORY_GENERATE_CHANGE_REPLY,
  STORY_GENERATE_CONFIRM_REPLY,
} from '@/lib/chat/story-generate-confirmation'

import { useChatActions } from '@/components/chat/chat-context'
import { useChatMentionTitles } from '@/components/chat/chat-mention-context'
import { ChatStoryConfirmAssets } from '@/components/chat/chat-story-confirm-assets'

export function ChatThreadMessageParts({
  message,
  role,
  isStreaming,
  actionsEnabled,
  confirmAssets,
  threadMessages,
}: {
  message: UIMessage
  role: UIMessage['role']
  isStreaming?: boolean
  actionsEnabled: boolean
  confirmAssets: readonly StoryAssetRef[]
  /** When set, enables cross-message generated-image URL stripping. */
  threadMessages?: readonly UIMessage[]
}) {
  const t = useTranslations('chatTools.requestStoryGenerateConfirmation')
  const mentionTitles = useChatMentionTitles()
  const { sendQuickReply } = useChatActions()

  const showConfirmationToolUi = !messageHasGenerateInstagramPostImage(message)

  const onConfirmGenerate = useCallback(() => {
    void sendQuickReply(STORY_GENERATE_CONFIRM_REPLY)
  }, [sendQuickReply])

  const onRequestChanges = useCallback(() => {
    void sendQuickReply(STORY_GENERATE_CHANGE_REPLY)
  }, [sendQuickReply])

  const storyGenerateConfirmation = useMemo(
    () =>
      showConfirmationToolUi
        ? {
            actionsEnabled: false,
            onConfirmGenerate,
            onRequestChanges,
          }
        : undefined,
    [showConfirmationToolUi, onConfirmGenerate, onRequestChanges],
  )

  return (
    <div className="flex flex-col gap-2">
      <SharedChatMessageParts
        isStreaming={isStreaming}
        mentionTitles={mentionTitles}
        message={message}
        role={role}
        storyGenerateConfirmation={storyGenerateConfirmation}
        threadMessages={threadMessages}
      />
      {confirmAssets.length > 0 ? <ChatStoryConfirmAssets assets={confirmAssets} /> : null}
      {actionsEnabled ? (
        <Suggestions data-testid="story-generate-confirmation-actions">
          <Suggestion onClick={onConfirmGenerate} suggestion={t('generate')} variant="default" />
          <Suggestion onClick={onRequestChanges} suggestion={t('change')} />
        </Suggestions>
      ) : null}
    </div>
  )
}
