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
import { ChatSalesReportSelect } from '@/components/chat/chat-sales-report-select'
import { MoreHorizontal, PanelsTopLeft, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState, type ReactNode } from 'react'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  CHAT_GATEWAY_MODEL_IDS,
  gatewayModelToMessageKey,
  type ChatGatewayModelId,
} from '@/lib/chat/gateway-chat-models'
import { CHAT_MODE_IDS, type ChatModeId } from '@/lib/chat/chat-modes'
import {
  getLeonardoPostModelMessageKey,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'
import {
  useChatActions,
  useChatComposerState,
  useChatMeta,
  useChatMessages,
  useChatStoryAssets,
} from '@/components/chat/chat-context'
import { ChatComposerMenus } from '@/components/chat/chat-composer-menus'
import {
  CHAT_MOBILE_ARTIFACT_ID,
  CHAT_MOBILE_ARTIFACT_OPEN_ID,
} from '@/components/chat/chat-mobile-artifact-sheet'
import { ChatSavedStoryAssetsStrip } from '@/components/chat/chat-saved-story-assets-strip'
import { useChatMobileArtifact } from '@/components/chat/chat-mobile-artifact-context'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import { cn } from '@workspace/ui/lib/utils'

const COMPACT_ICON_BUTTON_CLASS = 'size-11 touch-manipulation'

function ComposerAttachments() {
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
          className="size-16 lg:size-32"
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

function ComposerBody({ placeholder }: { placeholder: string }) {
  const compact = useCompactLayout()
  const { text } = useChatComposerState()
  const { handleTextChange } = useChatActions()

  return (
    <PromptInputBody>
      <PromptInputTextarea
        className={cn(compact && 'min-h-12')}
        placeholder={placeholder}
        value={text}
        onChange={handleTextChange}
      />
    </PromptInputBody>
  )
}

function ComposerSubmit() {
  const t = useTranslations('chat')
  const compact = useCompactLayout()
  const { text, pendingMediaAttachments } = useChatComposerState()
  const { isChatBusy, status } = useChatMeta()
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

function ComposerMobilePreviewButton() {
  const t = useTranslations('chat')
  const compact = useCompactLayout()
  const mobileArtifact = useChatMobileArtifact()

  if (!mobileArtifact) {
    return null
  }

  return (
    <PromptInputButton
      aria-controls={CHAT_MOBILE_ARTIFACT_ID}
      aria-label={t('mobileArtifactOpenAriaLabel')}
      className={cn('shrink-0 text-muted-foreground', compact && COMPACT_ICON_BUTTON_CLASS)}
      id={CHAT_MOBILE_ARTIFACT_OPEN_ID}
      onClick={mobileArtifact.openArtifact}
      tooltip={mobileArtifact.hint ?? t('mobileArtifactEmptyHint')}
      type="button"
      variant="ghost"
    >
      <PanelsTopLeft aria-hidden />
    </PromptInputButton>
  )
}

function ComposerClearDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('chat')
  const { handleClearChat } = useChatActions()

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-balance">{t('clearChatConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('clearChatConfirmDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">{t('clearChatConfirmCancel')}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              handleClearChat()
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

function ComposerSalesReportSelect() {
  const { locationId, analyticsRunId } = useChatComposerState()
  const { isChatBusy } = useChatMeta()
  const { setAnalyticsRunId } = useChatActions()

  return (
    <ChatSalesReportSelect
      disabled={isChatBusy}
      locationId={locationId}
      onValueChange={setAnalyticsRunId}
      value={analyticsRunId}
    />
  )
}

function ComposerModeSelect() {
  const { chatMode } = useChatComposerState()
  const { isChatBusy } = useChatMeta()
  const { setChatMode } = useChatActions()

  return <ChatModeSelect disabled={isChatBusy} onValueChange={setChatMode} value={chatMode} />
}

function ComposerGatewaySelect() {
  const { selectedChatModel } = useChatComposerState()
  const { isChatBusy } = useChatMeta()
  const { setSelectedChatModel } = useChatActions()

  return (
    <ChatGatewayModelSelect
      className="max-w-[min(100%,11rem)]"
      disabled={isChatBusy}
      onValueChange={setSelectedChatModel}
      value={selectedChatModel}
    />
  )
}

function ComposerLeonardoSelect() {
  const { selectedGenerationModel } = useChatComposerState()
  const { isChatBusy } = useChatMeta()
  const { setSelectedGenerationModel } = useChatActions()

  return (
    <LeonardoPostModelSelect
      className="max-w-[min(100%,11rem)]"
      disabled={isChatBusy}
      onValueChange={setSelectedGenerationModel}
      value={selectedGenerationModel}
    />
  )
}

function ComposerClearButton({ onRequestClear }: { onRequestClear: () => void }) {
  const t = useTranslations('chat')

  return (
    <PromptInputButton
      aria-label={t('clearChatAriaLabel')}
      className="shrink-0 text-muted-foreground"
      onClick={onRequestClear}
      tooltip={t('clearChatTooltip')}
      type="button"
      variant="ghost"
    >
      <Trash2 aria-hidden />
    </PromptInputButton>
  )
}

function ComposerSavedStoryAssets() {
  const { assets, onRemove } = useChatStoryAssets()
  const { isChatBusy } = useChatMeta()
  const { visibleMessages } = useChatMessages()

  return (
    <ChatSavedStoryAssetsStrip
      assets={assets}
      disabled={isChatBusy}
      messages={visibleMessages}
      onRemove={onRemove}
    />
  )
}

function GeneralOverflowMenu({ onRequestClear }: { onRequestClear: () => void }) {
  const t = useTranslations('chat')
  const tModes = useTranslations('chat.modes')
  const tGateway = useTranslations('chatGatewayModels')
  const { chatMode, selectedChatModel } = useChatComposerState()
  const { isChatBusy } = useChatMeta()
  const { setChatMode, setSelectedChatModel } = useChatActions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          aria-label={t('composerMoreAriaLabel')}
          className={cn('shrink-0 text-muted-foreground', COMPACT_ICON_BUTTON_CLASS)}
          disabled={isChatBusy}
          tooltip={t('composerMoreTooltip')}
          type="button"
          variant="ghost"
        >
          <MoreHorizontal aria-hidden />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tModes('ariaLabel')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>{tModes('ariaLabel')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(v) => setChatMode(v as ChatModeId)}
                value={chatMode}
              >
                {CHAT_MODE_IDS.map((id) => (
                  <DropdownMenuRadioItem key={id} value={id}>
                    {tModes(id)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tGateway('ariaLabel')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>{tGateway('ariaLabel')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(v) => setSelectedChatModel(v as ChatGatewayModelId)}
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRequestClear()}>
          <Trash2 aria-hidden />
          {t('clearChatLabel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ImageOverflowMenu({ onRequestClear }: { onRequestClear: () => void }) {
  const t = useTranslations('chat')
  const tModes = useTranslations('chat.modes')
  const tGateway = useTranslations('chatGatewayModels')
  const tLeonardo = useTranslations('postCreator.prompt')
  const { chatMode, selectedChatModel, selectedGenerationModel } = useChatComposerState()
  const { isChatBusy } = useChatMeta()
  const { setChatMode, setSelectedChatModel, setSelectedGenerationModel } = useChatActions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          aria-label={t('composerMoreAriaLabel')}
          className={cn('shrink-0 text-muted-foreground', COMPACT_ICON_BUTTON_CLASS)}
          disabled={isChatBusy}
          tooltip={t('composerMoreTooltip')}
          type="button"
          variant="ghost"
        >
          <MoreHorizontal aria-hidden />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tModes('ariaLabel')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>{tModes('ariaLabel')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(v) => setChatMode(v as ChatModeId)}
                value={chatMode}
              >
                {CHAT_MODE_IDS.map((id) => (
                  <DropdownMenuRadioItem key={id} value={id}>
                    {tModes(id)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tGateway('ariaLabel')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>{tGateway('ariaLabel')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(v) => setSelectedChatModel(v as ChatGatewayModelId)}
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tLeonardo('model.label')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>{tLeonardo('model.label')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(v) =>
                  setSelectedGenerationModel(v as typeof selectedGenerationModel)
                }
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRequestClear()}>
          <Trash2 aria-hidden />
          {t('clearChatLabel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GeneralDesktopTools({ onRequestClear }: { onRequestClear: () => void }) {
  return (
    <>
      <ComposerModeSelect />
      <ComposerGatewaySelect />
      <ComposerClearButton onRequestClear={onRequestClear} />
    </>
  )
}

function GeneralCompactTools({ onRequestClear }: { onRequestClear: () => void }) {
  return <GeneralOverflowMenu onRequestClear={onRequestClear} />
}

function ImageDesktopTools({ onRequestClear }: { onRequestClear: () => void }) {
  return (
    <>
      <ComposerModeSelect />
      <ComposerGatewaySelect />
      <ComposerLeonardoSelect />
      <ComposerClearButton onRequestClear={onRequestClear} />
    </>
  )
}

function ImageCompactTools({ onRequestClear }: { onRequestClear: () => void }) {
  return <ImageOverflowMenu onRequestClear={onRequestClear} />
}

function ComposerShell({
  placeholder,
  leading,
  modelTools,
}: {
  placeholder: string
  leading?: ReactNode
  modelTools: ReactNode
}) {
  const { handleSubmit } = useChatActions()

  return (
    <div className="shrink-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4 lg:pb-4">
      <PromptInput
        accept="image/jpeg,image/png,image/webp,image/gif"
        globalDrop
        maxFiles={CHAT_MAX_IMAGES}
        multiple
        onSubmit={handleSubmit}
      >
        {leading}
        <ComposerAttachments />
        <ChatComposerMenus>
          <ComposerBody placeholder={placeholder} />
        </ChatComposerMenus>
        <PromptInputFooter>
          <PromptInputTools>
            <ComposerMobilePreviewButton />
            <ComposerSalesReportSelect />
            {modelTools}
          </PromptInputTools>
          <ComposerSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

export function GeneralChatComposer() {
  const t = useTranslations('chat')
  const compact = useCompactLayout()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const onRequestClear = () => setClearConfirmOpen(true)

  return (
    <>
      <ComposerShell
        placeholder={t('placeholder')}
        modelTools={
          compact ? (
            <GeneralCompactTools onRequestClear={onRequestClear} />
          ) : (
            <GeneralDesktopTools onRequestClear={onRequestClear} />
          )
        }
      />
      <ComposerClearDialog onOpenChange={setClearConfirmOpen} open={clearConfirmOpen} />
    </>
  )
}

export function ImageAssistantComposer() {
  const t = useTranslations('chat')
  const compact = useCompactLayout()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const onRequestClear = () => setClearConfirmOpen(true)

  return (
    <>
      <ComposerShell
        placeholder={t('placeholderImageAssistant')}
        leading={<ComposerSavedStoryAssets />}
        modelTools={
          compact ? (
            <ImageCompactTools onRequestClear={onRequestClear} />
          ) : (
            <ImageDesktopTools onRequestClear={onRequestClear} />
          )
        }
      />
      <ComposerClearDialog onOpenChange={setClearConfirmOpen} open={clearConfirmOpen} />
    </>
  )
}

/** Selects the explicit composer variant for the active chat mode. */
export function ChatComposer() {
  const { chatMode } = useChatComposerState()
  if (chatMode === 'image_assistant') {
    return <ImageAssistantComposer />
  }
  return <GeneralChatComposer />
}
