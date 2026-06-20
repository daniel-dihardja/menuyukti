'use client'

import type { UIMessage } from 'ai'
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
import { useTranslations } from 'next-intl'

import { useWorkflowChatActions, useWorkflowChatState } from './workflow-chat-context'
import { WorkflowChatComposerMenus } from './workflow-chat-composer-menus'
import { WorkflowChatMessageParts } from './workflow-chat-message-parts'
import { getWorkflowMessageText } from './use-workflow-chat'

export function WorkflowChatPane() {
  const t = useTranslations('analytics.workflows.chat')
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const tMention = useTranslations('analytics.workflows.chat.mentionMenu')
  const {
    text,
    visibleMessages,
    error,
    status,
    selectedChatModel,
    isChatBusy,
    isSubmitDisabled,
    slashCommands,
  } = useWorkflowChatState()
  const {
    setText,
    setSelectedChatModel,
    handleTextChange,
    handleSubmit,
    handleSelectSlashCommand,
    handleSelectMention,
    handleRetry,
    handleClearChat,
    stop,
  } = useWorkflowChatActions()

  return (
    <>
      <Conversation aria-live="polite">
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
          {visibleMessages.length === 0 && !error ? (
            <ConversationEmptyState description={t('emptyDescription')} title={t('emptyTitle')} />
          ) : (
            <>
              {visibleMessages.map((msg: UIMessage) => {
                const isLast = msg === visibleMessages[visibleMessages.length - 1]
                const isActiveStream = isLast && (status === 'submitted' || status === 'streaming')
                const msgText = getWorkflowMessageText(msg)
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
                        <WorkflowChatMessageParts message={msg} role={msg.role} />
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
          <WorkflowChatComposerMenus
            commands={slashCommands}
            mentionAriaLabel={tMention('ariaLabel')}
            mentionEmptyLabel={tMention('empty')}
            onSelectMention={handleSelectMention}
            onSelectSlashCommand={(cmd) => void handleSelectSlashCommand(cmd)}
            onValueChange={setText}
            slashAriaLabel={tSlash('ariaLabel')}
            value={text}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t('placeholder')}
                value={text}
                onChange={handleTextChange}
              />
            </PromptInputBody>
          </WorkflowChatComposerMenus>
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
            <PromptInputSubmit
              aria-label={isChatBusy ? t('stopChatAriaLabel') : t('submitChatAriaLabel')}
              disabled={isSubmitDisabled}
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )
}
