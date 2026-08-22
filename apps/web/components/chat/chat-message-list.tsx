'use client'

import type { UIMessage } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Spinner } from '@workspace/ui/components/spinner'
import { CalendarDaysIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useChatActions, useChatMessages } from '@/components/chat/chat-context'
import { ChatMessageRow } from '@/components/chat/chat-message-row'
import { useChatViewportInset } from '@/components/chat/chat-viewport-inset-context'

const QUICK_PROMPT_KEYS = ['weeklyPlan', 'featureTopDishes', 'storiesAndReels'] as const

function ChatEmptyState() {
  const t = useTranslations('chat')
  const { isChatBusy } = useChatMessages()
  const { handleSelectSlashCommand } = useChatActions()

  return (
    <Empty className="min-h-full border-0 p-4 sm:p-8">
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon">
          <CalendarDaysIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-balance text-xl sm:text-lg">{t('emptyTitle')}</EmptyTitle>
        <EmptyDescription className="text-pretty">{t('emptyDescription')}</EmptyDescription>
        <EmptyDescription className="text-xs">{t('waitHint')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="w-full max-w-md gap-2">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {QUICK_PROMPT_KEYS.map((key) => (
            <Button
              className="h-11 w-full touch-manipulation justify-start text-left whitespace-normal sm:h-9 sm:w-auto sm:justify-center sm:whitespace-nowrap"
              disabled={isChatBusy}
              key={key}
              onClick={() => void handleSelectSlashCommand(t(`quickPrompts.${key}.prompt`))}
              size="sm"
              type="button"
              variant="outline"
            >
              {t(`quickPrompts.${key}.label`)}
            </Button>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  )
}

export function ChatMessageList() {
  const t = useTranslations('chat')
  const { visibleMessages, error, status, isChatBusy } = useChatMessages()
  const { handleRetry } = useChatActions()
  const { bottomInset } = useChatViewportInset()
  const scrollButtonBottom = `max(1rem, calc(env(safe-area-inset-bottom) + ${bottomInset}px))`

  return (
    <Conversation aria-live="polite" className="min-h-0" resize={isChatBusy ? 'instant' : 'smooth'}>
      <ConversationContent className="gap-5 px-4 py-3 sm:gap-8 sm:p-4">
        {error ? (
          <Alert aria-live="polite" className="items-start" variant="destructive">
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>{t('errorDescription')}</p>
              {error?.message ? (
                <p className="break-words font-mono text-muted-foreground text-xs">
                  {error.message}
                </p>
              ) : null}
              <Button
                className="h-11 w-full touch-manipulation sm:h-8 sm:w-fit"
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
        {visibleMessages.length === 0 && !error ? (
          <ChatEmptyState />
        ) : (
          <>
            {visibleMessages.map((msg: UIMessage, index: number) => {
              const isLast = index === visibleMessages.length - 1
              const isActiveStream = isLast && (status === 'submitted' || status === 'streaming')

              return (
                <ChatMessageRow
                  isActiveStream={isActiveStream}
                  key={msg.id}
                  message={msg}
                  visibleMessages={visibleMessages}
                />
              )
            })}
            {visibleMessages.length > 0 &&
              (status === 'submitted' || status === 'streaming') &&
              visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
                <Message from="assistant">
                  <MessageContent className="w-full max-w-full">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Spinner aria-hidden />
                      <span>{t('thinking')}</span>
                    </div>
                  </MessageContent>
                </Message>
              )}
          </>
        )}
      </ConversationContent>
      <ConversationScrollButton style={{ bottom: scrollButtonBottom }} />
    </Conversation>
  )
}
