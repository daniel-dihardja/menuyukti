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
import { LeonardoPostModelSelect } from '@/components/leonardo-post-model-select'
import { ChatModeSelect } from '@/components/chat-mode-select'
import { PanelsTopLeft, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  useWorkflowChatActions,
  useWorkflowChatComposerState,
  useWorkflowChatMessages,
} from './workflow-chat-context'
import { WorkflowChatComposerMenus } from './workflow-chat-composer-menus'
import { WorkflowChatSavedStoryAssetsStrip } from './workflow-chat-saved-story-assets-strip'
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
        <Attachment className="size-32" data={item.data} key={item.id} onRemove={item.onRemove}>
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
      className="shrink-0 text-muted-foreground"
      onClick={mobileArtifact.openArtifact}
      tooltip={mobileArtifact.hint ?? t('mobileArtifactEmptyHint')}
      type="button"
      variant="ghost"
    >
      <PanelsTopLeft className="size-4" />
    </PromptInputButton>
  )
}

export function WorkflowChatComposer() {
  const t = useTranslations('analytics.workflows.chat')
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const tMention = useTranslations('analytics.workflows.chat.mentionMenu')
  const {
    text,
    chatMode,
    selectedChatModel,
    selectedGenerationModel,
    slashCommands,
    savedStoryAssets,
  } = useWorkflowChatComposerState()
  const { isChatBusy, visibleMessages } = useWorkflowChatMessages()
  const {
    setText,
    setChatMode,
    setSelectedChatModel,
    setSelectedGenerationModel,
    handleTextChange,
    handleSubmit,
    handleSelectSlashCommand,
    handleSelectMention,
    handleSelectVisualizationMention,
    handleSelectMediaMention,
    handleRemoveSavedStoryAsset,
    handleClearChat,
  } = useWorkflowChatActions()

  const placeholder =
    chatMode === 'story_image_assistant' ? t('placeholderStoryAssistant') : t('placeholder')

  return (
    <div className="shrink-0 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4 lg:pb-4">
      <PromptInput
        accept="image/jpeg,image/png,image/webp,image/gif"
        globalDrop
        maxFiles={CHAT_MAX_IMAGES}
        multiple
        onSubmit={handleSubmit}
      >
        {chatMode === 'story_image_assistant' ? (
          <WorkflowChatSavedStoryAssetsStrip
            assets={savedStoryAssets}
            disabled={isChatBusy}
            messages={visibleMessages}
            onRemove={handleRemoveSavedStoryAsset}
          />
        ) : null}
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
              placeholder={placeholder}
              value={text}
              onChange={handleTextChange}
            />
          </PromptInputBody>
        </WorkflowChatComposerMenus>
        <PromptInputFooter>
          <PromptInputTools>
            <WorkflowMobilePreviewOpenButton />
            <ChatModeSelect disabled={isChatBusy} onValueChange={setChatMode} value={chatMode} />
            <ChatGatewayModelSelect
              className="max-w-[min(100%,7.5rem)] lg:max-w-[min(100%,11rem)]"
              disabled={isChatBusy}
              onValueChange={setSelectedChatModel}
              value={selectedChatModel}
            />
            <LeonardoPostModelSelect
              className="max-w-[min(100%,7.5rem)] lg:max-w-[min(100%,11rem)]"
              disabled={isChatBusy}
              onValueChange={setSelectedGenerationModel}
              value={selectedGenerationModel}
            />
            <PromptInputButton
              aria-label={t('clearChatAriaLabel')}
              className="shrink-0 text-muted-foreground"
              onClick={handleClearChat}
              tooltip={t('clearChatTooltip')}
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </PromptInputButton>
          </PromptInputTools>
          <WorkflowChatComposerSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
