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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { LeonardoPostModelSelect } from '@/components/leonardo-post-model-select'
import { ChatModeSelect } from '@/components/chat-mode-select'
import { MoreHorizontal, PanelsTopLeft, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  CHAT_GATEWAY_MODEL_IDS,
  gatewayModelToMessageKey,
  type ChatGatewayModelId,
} from '@/lib/chat/gateway-chat-models'
import {
  getLeonardoPostModelMessageKey,
  LEONARDO_POST_MODEL_IDS,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import {
  useChatActions,
  useChatComposerState,
  useChatMessages,
} from '@/components/chat/chat-context'
import { ChatComposerMenus } from '@/components/chat/chat-composer-menus'
import { CHAT_MOBILE_ARTIFACT_ID } from '@/components/chat/chat-mobile-artifact-sheet'
import { ChatSavedStoryAssetsStrip } from '@/components/chat/chat-saved-story-assets-strip'
import { useChatMobileArtifact } from '@/components/chat/chat-mobile-artifact-context'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import { cn } from '@workspace/ui/lib/utils'

const COMPACT_ICON_BUTTON_CLASS = 'size-11 touch-manipulation'

function ChatAttachmentStrip() {
  const attachments = usePromptInputAttachments()
  const { pendingMediaAttachments } = useChatComposerState()
  const { handleRemovePendingMedia } = useChatActions()

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
        <Attachment
          className="size-20 lg:size-32"
          data={item.data}
          key={item.id}
          onRemove={item.onRemove}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  )
}

function ChatComposerSubmit({ compact }: { compact: boolean }) {
  const t = useTranslations('chat')
  const { text, pendingMediaAttachments } = useChatComposerState()
  const { isChatBusy, status } = useChatMessages()
  const { stop } = useChatActions()
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
      className={cn(compact && COMPACT_ICON_BUTTON_CLASS)}
      disabled={disabled}
      onStop={stop}
      status={status}
    />
  )
}

function ChatMobilePreviewOpenButton({ compact }: { compact: boolean }) {
  const t = useTranslations('chat')
  const mobileArtifact = useChatMobileArtifact()

  if (!mobileArtifact) {
    return null
  }

  return (
    <PromptInputButton
      aria-controls={CHAT_MOBILE_ARTIFACT_ID}
      aria-label={t('mobileArtifactOpenAriaLabel')}
      className={cn('shrink-0 text-muted-foreground', compact && COMPACT_ICON_BUTTON_CLASS)}
      onClick={mobileArtifact.openArtifact}
      tooltip={mobileArtifact.hint ?? t('mobileArtifactEmptyHint')}
      type="button"
      variant="ghost"
    >
      <PanelsTopLeft />
    </PromptInputButton>
  )
}

function ChatClearConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const t = useTranslations('chat')

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('clearChatConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('clearChatConfirmDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">{t('clearChatConfirmCancel')}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {t('clearChatConfirmAction')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ChatComposerOverflowMenu({
  compact,
  chatMode,
  selectedChatModel,
  selectedGenerationModel,
  disabled,
  onChatModelChange,
  onGenerationModelChange,
  onRequestClear,
}: {
  compact: boolean
  chatMode: string
  selectedChatModel: ChatGatewayModelId
  selectedGenerationModel: LeonardoPostModelId
  disabled: boolean
  onChatModelChange: (id: ChatGatewayModelId) => void
  onGenerationModelChange: (id: LeonardoPostModelId) => void
  onRequestClear: () => void
}) {
  const t = useTranslations('chat')
  const tGateway = useTranslations('chatGatewayModels')
  const tLeonardo = useTranslations('postCreator.prompt')
  const showImageModel = chatMode === 'image_assistant'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          aria-label={t('composerMoreAriaLabel')}
          className={cn('shrink-0 text-muted-foreground', compact && COMPACT_ICON_BUTTON_CLASS)}
          disabled={disabled}
          tooltip={t('composerMoreTooltip')}
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tGateway('ariaLabel')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>{tGateway('ariaLabel')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(v) => onChatModelChange(v as ChatGatewayModelId)}
                value={selectedChatModel}
              >
                {CHAT_GATEWAY_MODEL_IDS.map((id) => (
                  <DropdownMenuRadioItem key={id} value={id}>
                    {tGateway(gatewayModelToMessageKey(id))}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {showImageModel ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{tLeonardo('model.label')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuLabel>{tLeonardo('model.label')}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  onValueChange={(v) => onGenerationModelChange(v as LeonardoPostModelId)}
                  value={selectedGenerationModel}
                >
                  {LEONARDO_POST_MODEL_IDS.map((id) => (
                    <DropdownMenuRadioItem key={id} value={id}>
                      {tLeonardo(`model.options.${getLeonardoPostModelMessageKey(id)}.name`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRequestClear()}>
          <Trash2 />
          {t('clearChatLabel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ChatComposer() {
  const t = useTranslations('chat')
  const tSlash = useTranslations('chat.slashCommands')
  const tMention = useTranslations('chat.mentionMenu')
  const compact = useCompactLayout()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const {
    text,
    chatMode,
    selectedChatModel,
    selectedGenerationModel,
    slashCommands,
    savedStoryAssets,
  } = useChatComposerState()
  const { isChatBusy, visibleMessages } = useChatMessages()
  const {
    setText,
    setChatMode,
    setSelectedChatModel,
    setSelectedGenerationModel,
    handleTextChange,
    handleSubmit,
    handleSelectSlashCommand,
    handleSelectVisualizationMention,
    handleSelectMediaMention,
    handleRemoveSavedStoryAsset,
    handleClearChat,
  } = useChatActions()

  const placeholder =
    chatMode === 'image_assistant' ? t('placeholderImageAssistant') : t('placeholder')
  const showImageModel = chatMode === 'image_assistant'

  return (
    <div className="shrink-0 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4 lg:pb-4">
      <PromptInput
        accept="image/jpeg,image/png,image/webp,image/gif"
        globalDrop
        maxFiles={CHAT_MAX_IMAGES}
        multiple
        onSubmit={handleSubmit}
      >
        {showImageModel ? (
          <ChatSavedStoryAssetsStrip
            assets={savedStoryAssets}
            disabled={isChatBusy}
            messages={visibleMessages}
            onRemove={handleRemoveSavedStoryAsset}
          />
        ) : null}
        <ChatAttachmentStrip />
        <ChatComposerMenus
          commands={slashCommands}
          mentionAriaLabel={tMention('ariaLabel')}
          mentionEmptyLabel={tMention('empty')}
          onSelectMediaMention={handleSelectMediaMention}
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
        </ChatComposerMenus>
        <PromptInputFooter>
          <PromptInputTools>
            <ChatMobilePreviewOpenButton compact={compact} />
            <ChatModeSelect disabled={isChatBusy} onValueChange={setChatMode} value={chatMode} />
            {compact ? (
              <ChatComposerOverflowMenu
                chatMode={chatMode}
                compact={compact}
                disabled={isChatBusy}
                onChatModelChange={setSelectedChatModel}
                onGenerationModelChange={setSelectedGenerationModel}
                onRequestClear={() => setClearConfirmOpen(true)}
                selectedChatModel={selectedChatModel}
                selectedGenerationModel={selectedGenerationModel}
              />
            ) : (
              <>
                <ChatGatewayModelSelect
                  className="max-w-[min(100%,11rem)]"
                  disabled={isChatBusy}
                  onValueChange={setSelectedChatModel}
                  value={selectedChatModel}
                />
                {showImageModel ? (
                  <LeonardoPostModelSelect
                    className="max-w-[min(100%,11rem)]"
                    disabled={isChatBusy}
                    onValueChange={setSelectedGenerationModel}
                    value={selectedGenerationModel}
                  />
                ) : null}
                <PromptInputButton
                  aria-label={t('clearChatAriaLabel')}
                  className="shrink-0 text-muted-foreground"
                  onClick={() => setClearConfirmOpen(true)}
                  tooltip={t('clearChatTooltip')}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </PromptInputButton>
              </>
            )}
          </PromptInputTools>
          <ChatComposerSubmit compact={compact} />
        </PromptInputFooter>
      </PromptInput>
      <ChatClearConfirmDialog
        onConfirm={handleClearChat}
        onOpenChange={setClearConfirmOpen}
        open={clearConfirmOpen}
      />
    </div>
  )
}
