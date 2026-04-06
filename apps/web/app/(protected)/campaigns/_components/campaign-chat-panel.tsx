'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@workspace/ui/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from '@workspace/ui/components/ai-elements/artifact'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}

export type CampaignChatPanelProps = {
  campaignId: number
}

export function CampaignChatPanel({ campaignId }: CampaignChatPanelProps) {
  void campaignId
  const t = useTranslations('analytics.campaigns.chat')
  const [text, setText] = useState('')

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
      }),
    [],
  )

  const { messages, sendMessage, status, stop } = useChat({ transport })

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim())
      const hasAttachments = Boolean(message.files?.length)

      if (!(hasText || hasAttachments)) {
        return
      }

      const content = message.text?.trim() || 'Sent with attachments'
      setText('')
      await sendMessage({
        text: content,
        ...(message.files?.length ? { files: message.files } : {}),
      })
    },
    [sendMessage],
  )

  const isSubmitDisabled = useMemo(
    () => !text.trim() || status === 'streaming' || status === 'submitted',
    [text, status],
  )

  const visibleMessages = useMemo(() => messages.filter((msg) => msg.role !== 'system'), [messages])

  return (
    <div className="grid size-full grid-cols-3 gap-4 overflow-hidden">
      <div className="relative col-span-1 flex flex-col divide-y overflow-hidden rounded-lg border">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title={t('emptyTitle')}
                description={t('emptyDescription')}
              />
            ) : (
              <>
                {visibleMessages.map((msg) => {
                  const isLast = msg === visibleMessages[visibleMessages.length - 1]
                  const isActiveStream =
                    isLast && (status === 'submitted' || status === 'streaming')
                  const msgText = getMessageText(msg)
                  const showFallbackSpinner =
                    isActiveStream &&
                    msg.role === 'assistant' &&
                    msgText.length === 0

                  return (
                    <Message key={msg.id} from={msg.role}>
                      <MessageContent>
                        {showFallbackSpinner ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Spinner />
                            <span>{t('thinking')}</span>
                          </div>
                        ) : (
                          <MessageResponse>{msgText}</MessageResponse>
                        )}
                      </MessageContent>
                    </Message>
                  )
                })}
                {visibleMessages.length > 0 &&
                  (status === 'submitted' || status === 'streaming') &&
                  visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Spinner />
                          <span>{t('thinking')}</span>
                        </div>
                      </MessageContent>
                    </Message>
                  )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="shrink-0 p-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t('placeholder')}
                value={text}
                onChange={handleTextChange}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      <div className="col-span-2 min-h-0 overflow-hidden">
        <Artifact className="h-full max-h-full">
          <ArtifactHeader>
            <div className="flex flex-col gap-1">
              <ArtifactTitle>{t('artifactTitle')}</ArtifactTitle>
              <ArtifactDescription>{t('artifactPlaceholder')}</ArtifactDescription>
            </div>
          </ArtifactHeader>
          <ArtifactContent className="flex min-h-[12rem] items-center justify-center text-muted-foreground text-sm">
            {/* Reserved for future campaign artifacts */}
          </ArtifactContent>
        </Artifact>
      </div>
    </div>
  )
}
