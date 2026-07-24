'use client'

import type { UIMessage } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useTranslations } from 'next-intl'

import { useWorkflowChatActions, useWorkflowChatMessages } from './workflow-chat-context'
import { WorkflowChatMessageRow } from './workflow-chat-message-row'

export function WorkflowChatMessageList() {
  const t = useTranslations('analytics.workflows.chat')
  const { visibleMessages, error, status, isChatBusy } = useWorkflowChatMessages()
  const { handleRetry } = useWorkflowChatActions()

  return (
    <Conversation aria-live="polite" resize={isChatBusy ? 'instant' : 'smooth'}>
      <ConversationContent>
        {error ? (
          <Alert aria-live="polite" className="items-start" variant="destructive">
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>{t('errorDescription')}</p>
              {error?.message ? (
                <p className="font-mono text-muted-foreground text-xs break-words">
                  {error.message}
                </p>
              ) : null}
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
        {visibleMessages.length === 0 && !error ? (
          <ConversationEmptyState description={t('emptyDescription')} title={t('emptyTitle')} />
        ) : (
          <>
            {visibleMessages.map((msg: UIMessage, index: number) => {
              const isLast = index === visibleMessages.length - 1
              const isActiveStream = isLast && (status === 'submitted' || status === 'streaming')

              return (
                <WorkflowChatMessageRow
                  isActiveStream={isActiveStream}
                  key={msg.id}
                  message={msg}
                  thinkingLabel={t('thinking')}
                />
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
  )
}
