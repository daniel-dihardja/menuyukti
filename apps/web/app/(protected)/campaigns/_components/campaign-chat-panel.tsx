'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
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
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'

import { ChatMessageParts } from './chat-message-parts'

export type CampaignChatPanelProps = {
  campaignId: number
}

export function CampaignChatPanel({ campaignId }: CampaignChatPanelProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const [text, setText] = useState('')

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { campaignId },
      }),
    [campaignId],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate } = useChat({
    transport,
  })

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

  const handleRetry = useCallback(async () => {
    clearError()
    await regenerate()
  }, [clearError, regenerate])

  const isSubmitDisabled = !text.trim() || status === 'streaming' || status === 'submitted'

  const visibleMessages = messages.filter((msg) => msg.role !== 'system')

  return (
    <div className="grid size-full grid-cols-3 gap-4 overflow-hidden">
      <div className="relative col-span-1 flex flex-col divide-y overflow-hidden rounded-lg border">
        <Conversation aria-live="polite">
          <ConversationContent>
            {error ? (
              <div
                aria-live="polite"
                className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm"
                role="alert"
              >
                <p className="font-medium">{t('errorTitle')}</p>
                <p className="mt-1 text-muted-foreground">{error.message}</p>
                <Button className="mt-3" onClick={() => void handleRetry()} size="sm" type="button" variant="outline">
                  {t('retry')}
                </Button>
              </div>
            ) : null}
            {messages.length === 0 && !error ? (
              <ConversationEmptyState description={t('emptyDescription')} title={t('emptyTitle')} />
            ) : (
              <>
                {visibleMessages.map((msg) => {
                  const isLast = msg === visibleMessages[visibleMessages.length - 1]
                  const isActiveStream = isLast && (status === 'submitted' || status === 'streaming')
                  const msgText = getMessageText(msg)
                  const showFallbackSpinner =
                    isActiveStream && msg.role === 'assistant' && msgText.length === 0

                  return (
                    <Message from={msg.role} key={msg.id}>
                      <MessageContent>
                        {showFallbackSpinner ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Spinner />
                            <span>{t('thinking')}</span>
                          </div>
                        ) : (
                          <ChatMessageParts message={msg} role={msg.role} />
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

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}
