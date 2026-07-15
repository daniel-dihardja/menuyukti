'use client'

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
import { useTranslations } from 'next-intl'

import {
  useWorkflowChatActions,
  useWorkflowChatComposerState,
  useWorkflowChatMessages,
} from './workflow-chat-context'
import { WorkflowChatComposerMenus } from './workflow-chat-composer-menus'

export function WorkflowChatComposer() {
  const t = useTranslations('analytics.workflows.chat')
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const tMention = useTranslations('analytics.workflows.chat.mentionMenu')
  const { text, selectedChatModel, isSubmitDisabled, slashCommands } =
    useWorkflowChatComposerState()
  const { isChatBusy, status } = useWorkflowChatMessages()
  const {
    setText,
    setSelectedChatModel,
    handleTextChange,
    handleSubmit,
    handleSelectSlashCommand,
    handleSelectMention,
    handleSelectVisualizationMention,
    handleClearChat,
    stop,
  } = useWorkflowChatActions()

  return (
    <div className="shrink-0 p-4">
      <PromptInput globalDrop multiple onSubmit={handleSubmit}>
        <WorkflowChatComposerMenus
          commands={slashCommands}
          mentionAriaLabel={tMention('ariaLabel')}
          mentionEmptyLabel={tMention('empty')}
          onSelectMention={handleSelectMention}
          onSelectVisualizationMention={handleSelectVisualizationMention}
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
  )
}
