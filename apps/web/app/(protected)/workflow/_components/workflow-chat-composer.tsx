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
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Label } from '@workspace/ui/components/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { PanelsTopLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  useWorkflowChatActions,
  useWorkflowChatComposerState,
  useWorkflowChatMessages,
} from './workflow-chat-context'
import { WorkflowChatComposerMenus } from './workflow-chat-composer-menus'
import { useWorkflowMobileArtifact } from './workflow-mobile-artifact-context'

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
      disabled={disabled}
      onStop={stop}
      status={status}
    />
  )
}

function WorkflowMobilePreviewOpenButton() {
  const t = useTranslations('analytics.workflows.chat')
  const mobileArtifact = useWorkflowMobileArtifact()

  if (!mobileArtifact) {
    return null
  }

  return (
    <PromptInputButton
      aria-controls="workflow-mobile-artifact"
      aria-label={t('mobileArtifactOpenAriaLabel')}
      className="h-9 shrink-0 gap-1.5 px-2.5 font-medium text-muted-foreground"
      onClick={mobileArtifact.openArtifact}
      size="sm"
      tooltip={mobileArtifact.hint ?? t('mobileArtifactEmptyHint')}
      type="button"
      variant="ghost"
    >
      <PanelsTopLeft className="size-4" />
      <span className="text-sm">{t('mobileArtifactOpenLabel')}</span>
    </PromptInputButton>
  )
}

function WorkflowChatAutoAttachCheckbox() {
  const t = useTranslations('analytics.workflows.chat')
  const { autoAttachGenerated } = useWorkflowChatComposerState()
  const { isChatBusy } = useWorkflowChatMessages()
  const { setAutoAttachGenerated } = useWorkflowChatActions()

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-9 shrink-0 items-center gap-2 px-1">
            <Checkbox
              aria-label={t('autoAttachGeneratedAriaLabel')}
              checked={autoAttachGenerated}
              disabled={isChatBusy}
              id="workflow-chat-auto-attach-generated"
              onCheckedChange={(checked) => setAutoAttachGenerated(checked === true)}
            />
            <Label
              className="cursor-pointer font-medium text-muted-foreground text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              htmlFor="workflow-chat-auto-attach-generated"
            >
              {t('autoAttachGeneratedLabel')}
            </Label>
          </div>
        </TooltipTrigger>
        <TooltipContent>{t('autoAttachGeneratedTooltip')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    handleClearChat,
  } = useWorkflowChatActions()

  return (
    <div className="shrink-0 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4 lg:pb-4">
      <PromptInput
        accept="image/jpeg,image/png,image/webp,image/gif"
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
              placeholder={t('placeholder')}
              value={text}
              onChange={handleTextChange}
            />
          </PromptInputBody>
        </WorkflowChatComposerMenus>
        <PromptInputFooter>
          <PromptInputTools>
            <WorkflowMobilePreviewOpenButton />
            <WorkflowChatAutoAttachCheckbox />
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
          <WorkflowChatComposerSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
