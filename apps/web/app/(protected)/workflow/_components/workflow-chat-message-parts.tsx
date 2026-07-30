'use client'

import type { UIMessage } from 'ai'
import { Suggestion, Suggestions } from '@workspace/ui/components/ai-elements/suggestion'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

import { ChatMessageParts } from '@/components/chat-message-parts'
import {
  storyAssetsAsOfMessage,
  styleAndContentStoryAssets,
} from '@/lib/chat/story-assets-from-messages'
import {
  isStoryGenerateConfirmationActionable,
  messageHasCompletedStoryGenerateConfirmation,
  messageHasGenerateInstagramPostImage,
  STORY_GENERATE_CHANGE_REPLY,
  STORY_GENERATE_CONFIRM_REPLY,
} from '@/lib/chat/story-generate-confirmation'

import { useWorkflowChatActions, useWorkflowChatMessages } from './workflow-chat-context'
import { useWorkflowChatMentionTitles } from './workflow-chat-mention-context'
import { WorkflowChatStoryConfirmAssets } from './workflow-chat-story-confirm-assets'

export function WorkflowChatMessageParts({
  message,
  role,
  isStreaming,
}: {
  message: UIMessage
  role: UIMessage['role']
  isStreaming?: boolean
}) {
  const t = useTranslations('chatTools.requestStoryGenerateConfirmation')
  const mentionTitles = useWorkflowChatMentionTitles()
  const { visibleMessages, status } = useWorkflowChatMessages()
  const { sendQuickReply } = useWorkflowChatActions()

  const hideToolUi = messageHasGenerateInstagramPostImage(message)

  const actionsEnabled = useMemo(
    () =>
      isStoryGenerateConfirmationActionable({
        message,
        messages: visibleMessages,
        status,
      }),
    [message, visibleMessages, status],
  )

  const confirmAssets = useMemo(() => {
    if (!messageHasCompletedStoryGenerateConfirmation(message)) return []
    return styleAndContentStoryAssets(storyAssetsAsOfMessage(visibleMessages, message.id))
  }, [message, visibleMessages])

  const onConfirmGenerate = useCallback(() => {
    void sendQuickReply(STORY_GENERATE_CONFIRM_REPLY)
  }, [sendQuickReply])

  const onRequestChanges = useCallback(() => {
    void sendQuickReply(STORY_GENERATE_CHANGE_REPLY)
  }, [sendQuickReply])

  const storyGenerateConfirmation = useMemo(
    () => ({
      // Buttons render below the message; tool part only shows compact status / hide.
      actionsEnabled: false,
      hideToolUi,
      onConfirmGenerate,
      onRequestChanges,
    }),
    [hideToolUi, onConfirmGenerate, onRequestChanges],
  )

  return (
    <div className="flex flex-col gap-2">
      <ChatMessageParts
        isStreaming={isStreaming}
        mentionTitles={mentionTitles}
        message={message}
        role={role}
        storyGenerateConfirmation={storyGenerateConfirmation}
        threadMessages={visibleMessages}
      />
      {confirmAssets.length > 0 ? <WorkflowChatStoryConfirmAssets assets={confirmAssets} /> : null}
      {actionsEnabled ? (
        <Suggestions data-testid="story-generate-confirmation-actions">
          <Suggestion onClick={onConfirmGenerate} suggestion={t('generate')} variant="default" />
          <Suggestion onClick={onRequestChanges} suggestion={t('change')} />
        </Suggestions>
      ) : null}
    </div>
  )
}
