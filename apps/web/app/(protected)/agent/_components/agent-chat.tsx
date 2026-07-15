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
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useRef, useState } from 'react'

import { ChatMessageParts } from '@/components/chat-message-parts'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

export function AgentChat() {
  const t = useTranslations('agentChat')
  const [text, setText] = useState('')
  const [agentThreadId, setAgentThreadId] = useState(() => crypto.randomUUID())
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const selectedChatModelRef = useRef<ChatGatewayModelId>(DEFAULT_CHAT_GATEWAY_MODEL)
  selectedChatModelRef.current = selectedChatModel

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body: mergedBody }) => {
          const lastUser = [...messages].reverse().find((m) => m.role === 'user')
          return {
            body: {
              ...mergedBody,
              messages: lastUser ? [lastUser] : messages,
              agentThreadId,
              model: selectedChatModelRef.current,
            },
          }
        },
      }),
    [agentThreadId],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate, setMessages } =
    useChat({
      id: agentThreadId,
      transport,
    })

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim())
      if (!hasText) {
        return
      }
      const content = message.text?.trim() ?? ''
      setText('')
      await sendMessage({ text: content })
    },
    [sendMessage],
  )

  const handleRetry = useCallback(async () => {
    clearError()
    await regenerate()
  }, [clearError, regenerate])

  const handleClearChat = useCallback(() => {
    stop()
    clearError()
    setMessages([])
    setText('')
    setAgentThreadId(crypto.randomUUID())
  }, [stop, clearError, setMessages])

  const isChatBusy = status === 'streaming' || status === 'submitted'
  const isSubmitDisabled = !text.trim() && !isChatBusy
  const visibleMessages = useMemo(() => messages.filter((msg) => msg.role !== 'system'), [messages])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-2xl flex-1 flex-col overflow-hidden">
        <Conversation
          aria-live="polite"
          className="h-full min-h-0 flex-1"
          resize={isChatBusy ? 'instant' : 'smooth'}
        >
          <ConversationContent>
            {error ? (
              <Alert aria-live="polite" className="items-start" variant="destructive">
                <AlertTitle>{t('errorTitle')}</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <p>{t('errorDescription')}</p>
                  <Button
                    className="w-fit"
                    onClick={() => void handleRetry()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {t('retry')}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {messages.length === 0 && !error ? (
              <ConversationEmptyState description={t('emptyDescription')} title={t('emptyTitle')} />
            ) : (
              <>
                {visibleMessages.map((msg) => {
                  const isLast = msg === visibleMessages[visibleMessages.length - 1]
                  const isActiveStream =
                    isLast && (status === 'submitted' || status === 'streaming')
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
                          <ChatMessageParts
                            isStreaming={isActiveStream}
                            message={msg}
                            role={msg.role}
                          />
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
        <div className="shrink-0 pt-2 pb-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t('placeholder')}
                value={text}
                onChange={handleTextChange}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <ChatGatewayModelSelect
                  disabled={isChatBusy}
                  onValueChange={setSelectedChatModel}
                  value={selectedChatModel}
                />
                <PromptInputButton
                  aria-label={t('clearChatAriaLabel')}
                  className="h-9 shrink-0 px-3 py-2 font-medium text-muted-foreground"
                  onClick={handleClearChat}
                  size="sm"
                  tooltip={t('clearChatTooltip')}
                  type="button"
                  variant="ghost"
                >
                  {t('clearChatLabel')}
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
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
