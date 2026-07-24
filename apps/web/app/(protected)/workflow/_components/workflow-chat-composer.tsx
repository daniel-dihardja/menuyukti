'use client'

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@workspace/ui/components/ai-elements/attachments'
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { EraserIcon, PaperclipIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  useWorkflowChatActions,
  useWorkflowChatComposerState,
  useWorkflowChatMessages,
} from './workflow-chat-context'
import { WorkflowChatComposerMenus } from './workflow-chat-composer-menus'

function WorkflowChatAttachmentStrip() {
  const attachments = usePromptInputAttachments()
  const { pendingMediaAttachments } = useWorkflowChatComposerState()
  const { handleRemovePendingMedia } = useWorkflowChatActions()

  const uploadItems = attachments.files.map((f) => ({
    id: f.id,
    data: f,
    onRemove: () => attachments.remove(f.id),
  }))
  const mediaItems = pendingMediaAttachments.map((m) => ({
    id: m.id,
    data: {
      id: m.id,
      type: 'file' as const,
      filename: m.name,
      mediaType: m.mediaType,
      url: m.url,
    },
    onRemove: () => handleRemovePendingMedia(m.id),
  }))
  const items = [...uploadItems, ...mediaItems]

  if (items.length === 0) {
    return null
  }

  return (
    <Attachments className="ml-0 w-full justify-start px-3 pt-3" variant="grid">
      {items.map((item) => (
        <Attachment className="size-16" data={item.data} key={item.id} onRemove={item.onRemove}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  )
}

function WorkflowChatAttachButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations('analytics.workflows.chat')
  const attachments = usePromptInputAttachments()
  const { pendingMediaAttachments } = useWorkflowChatComposerState()
  const atLimit = attachments.files.length + pendingMediaAttachments.length >= CHAT_MAX_IMAGES

  return (
    <PromptInputButton
      aria-label={t('attachImageAriaLabel')}
      className="size-11 touch-manipulation sm:size-8"
      disabled={disabled || atLimit}
      onClick={() => attachments.openFileDialog()}
      tooltip={atLimit ? t('attachImageMaxReachedTooltip') : t('attachImageTooltip')}
      type="button"
      variant="ghost"
    >
      <PaperclipIcon />
    </PromptInputButton>
  )
}

function WorkflowChatComposerSubmit() {
  const t = useTranslations('analytics.workflows.chat')
  const { text, pendingMediaAttachments } = useWorkflowChatComposerState()
  const { isChatBusy, status } = useWorkflowChatMessages()
  const { stop } = useWorkflowChatActions()
  const attachments = usePromptInputAttachments()

  const disabled = useMemo(() => {
    if (isChatBusy) return false
    const hasContent =
      Boolean(text.trim()) || attachments.files.length > 0 || pendingMediaAttachments.length > 0
    return !hasContent
  }, [attachments.files.length, isChatBusy, pendingMediaAttachments.length, text])

  return (
    <PromptInputSubmit
      aria-label={isChatBusy ? t('stopChatAriaLabel') : t('submitChatAriaLabel')}
      className="size-11 touch-manipulation sm:size-8"
      disabled={disabled}
      onStop={stop}
      status={status}
    />
  )
}

function WorkflowChatClearButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations('analytics.workflows.chat')
  const { handleClearChat } = useWorkflowChatActions()

  return (
    <PromptInputButton
      aria-label={t('clearChatAriaLabel')}
      className="size-11 shrink-0 touch-manipulation text-muted-foreground sm:h-8 sm:w-auto sm:px-2.5 sm:font-medium"
      disabled={disabled}
      onClick={handleClearChat}
      size="sm"
      tooltip={t('clearChatTooltip')}
      type="button"
      variant="ghost"
    >
      <EraserIcon className="sm:hidden" />
      <span className="hidden sm:inline">{t('clearChatLabel')}</span>
    </PromptInputButton>
  )
}

export function WorkflowChatComposer() {
  const t = useTranslations('analytics.workflows.chat')
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const tMention = useTranslations('analytics.workflows.chat.mentionMenu')
  const { text, selectedChatModel, slashCommands } = useWorkflowChatComposerState()
  const { isChatBusy } = useWorkflowChatMessages()
  const {
    setText,
    setSelectedChatModel,
    handleTextChange,
    handleSubmit,
    handleSelectSlashCommand,
    handleSelectMention,
    handleSelectVisualizationMention,
    handleSelectMediaMention,
  } = useWorkflowChatActions()

  return (
    <div className="shrink-0 border-t bg-background px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3 sm:pb-4">
      <PromptInput
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="shadow-sm"
        globalDrop
        maxFiles={CHAT_MAX_IMAGES}
        multiple
        onSubmit={handleSubmit}
      >
        <WorkflowChatAttachmentStrip />
        <WorkflowChatComposerMenus
          commands={slashCommands}
          mentionAriaLabel={tMention('ariaLabel')}
          mentionEmptyLabel={tMention('empty')}
          onSelectMediaMention={handleSelectMediaMention}
          onSelectMention={handleSelectMention}
          onSelectVisualizationMention={handleSelectVisualizationMention}
          onSelectSlashCommand={(cmd) => void handleSelectSlashCommand(cmd)}
          onValueChange={setText}
          slashAriaLabel={tSlash('ariaLabel')}
          value={text}
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="min-h-12 sm:min-h-16"
              enterKeyHint="send"
              placeholder={t('placeholder')}
              value={text}
              onChange={handleTextChange}
            />
          </PromptInputBody>
        </WorkflowChatComposerMenus>
        <PromptInputFooter className="flex-wrap gap-2">
          <PromptInputTools className="min-w-0 flex-1 flex-wrap">
            <WorkflowChatAttachButton disabled={isChatBusy} />
            <ChatGatewayModelSelect
              className="max-w-[min(100%,9.5rem)] sm:max-w-[min(100%,11rem)]"
              disabled={isChatBusy}
              onValueChange={setSelectedChatModel}
              value={selectedChatModel}
            />
            <WorkflowChatClearButton disabled={isChatBusy} />
          </PromptInputTools>
          <WorkflowChatComposerSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
