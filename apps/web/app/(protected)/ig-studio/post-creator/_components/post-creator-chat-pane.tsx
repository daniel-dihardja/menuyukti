'use client'

import type { FileUIPart } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@workspace/ui/components/ai-elements/attachments'
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
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { ChatMessageParts } from '@/components/chat-message-parts'
import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import { CHAT_STREAM_THROTTLE_MS } from '@/lib/chat/chat-stream-config'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { shouldShowAssistantThinkingFallback } from '@/lib/chat/should-show-assistant-thinking-fallback'
import {
  formatMediaMentionLabel,
  mediaTypeFromFilename,
} from '@/lib/chat/workflow-chat-media-mention'
import type { MediaCatalogItem } from '@/lib/media/client-api'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

import { usePostCreator } from '../_context/use-post-creator'
import {
  PostCreatorChatPreviewMention,
  type PostCreatorPreviewMentionCandidate,
} from './post-creator-chat-preview-mention'

const PREVIEW_ATTACHMENT_ID = 'post-creator-current-preview'

type PendingPreviewAttachment = {
  id: string
  kind: 'post' | 'photo'
  name: string
  url: string
  mediaType: string
  label: string
  /** Stable identity for syncing when the large preview changes. */
  identity: string
}

export function PostCreatorChatPane() {
  const t = useTranslations('postCreator.chat')
  const { meta } = usePostCreator()
  const { postId, previewImageUrl, previewMediaS3Key } = meta

  const [text, setText] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<PendingPreviewAttachment[]>([])
  const pendingAttachmentsRef = useRef<PendingPreviewAttachment[]>([])
  pendingAttachmentsRef.current = pendingAttachments

  const [agentThreadId, setAgentThreadId] = useState(() => crypto.randomUUID())
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const selectedChatModelRef = useRef<ChatGatewayModelId>(DEFAULT_CHAT_GATEWAY_MODEL)
  selectedChatModelRef.current = selectedChatModel
  const agentThreadIdRef = useRef(agentThreadId)
  agentThreadIdRef.current = agentThreadId

  const chatId = postId ?? agentThreadId

  const previewCandidate = useMemo((): PostCreatorPreviewMentionCandidate | null => {
    const postName = parsePostMediaFilename(previewMediaS3Key)
    if (postName && previewImageUrl) {
      return {
        kind: 'post',
        name: postName,
        url: previewImageUrl,
        label: t('previewChipLabel'),
      }
    }
    return null
  }, [previewImageUrl, previewMediaS3Key, t])

  const previewIdentity = previewCandidate
    ? `${previewCandidate.kind}:${previewCandidate.name}`
    : null

  const excludeNames = useMemo(
    () => new Set(pendingAttachments.filter((a) => a.kind === 'photo').map((a) => a.name)),
    [pendingAttachments],
  )

  useEffect(() => {
    setPendingAttachments((prev) => {
      const previewIdx = prev.findIndex((a) => a.id === PREVIEW_ATTACHMENT_ID)
      if (previewIdx < 0) return prev

      if (!previewCandidate || !previewIdentity) {
        return prev.filter((a) => a.id !== PREVIEW_ATTACHMENT_ID)
      }

      const existing = prev[previewIdx]!
      if (existing.identity !== previewIdentity) {
        const next = [...prev]
        next[previewIdx] = {
          id: PREVIEW_ATTACHMENT_ID,
          kind: previewCandidate.kind,
          name: previewCandidate.name,
          url: previewCandidate.url,
          mediaType: mediaTypeFromFilename(previewCandidate.name),
          label: previewCandidate.label,
          identity: previewIdentity,
        }
        return next
      }

      if (existing.url !== previewCandidate.url || existing.label !== previewCandidate.label) {
        const next = [...prev]
        next[previewIdx] = {
          ...existing,
          url: previewCandidate.url,
          label: previewCandidate.label,
        }
        return next
      }

      return prev
    })
  }, [previewCandidate, previewIdentity])

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
              agentThreadId: agentThreadIdRef.current,
              model: selectedChatModelRef.current,
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate, setMessages } =
    useChat({
      id: chatId,
      transport,
      experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    })

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }, [])

  const handleSelectPreview = useCallback(
    (candidate: PostCreatorPreviewMentionCandidate) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      const nextAttachment: PendingPreviewAttachment = {
        id: PREVIEW_ATTACHMENT_ID,
        kind: candidate.kind,
        name: candidate.name,
        url: candidate.url,
        mediaType: mediaTypeFromFilename(candidate.name),
        label: candidate.label,
        identity: `${candidate.kind}:${candidate.name}`,
      }
      setPendingAttachments((prev) => {
        const withoutPreview = prev.filter((a) => a.id !== PREVIEW_ATTACHMENT_ID)
        if (withoutPreview.length >= CHAT_MAX_IMAGES) {
          return prev.some((a) => a.id === PREVIEW_ATTACHMENT_ID)
            ? prev.map((a) => (a.id === PREVIEW_ATTACHMENT_ID ? nextAttachment : a))
            : prev
        }
        const existingIdx = prev.findIndex((a) => a.id === PREVIEW_ATTACHMENT_ID)
        if (existingIdx >= 0) {
          const next = [...prev]
          next[existingIdx] = nextAttachment
          return next
        }
        return [...prev, nextAttachment]
      })
    },
    [status],
  )

  const handleSelectMedia = useCallback(
    (item: MediaCatalogItem) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      setPendingAttachments((prev) => {
        if (prev.some((a) => a.kind === 'photo' && a.name === item.name)) {
          return prev
        }
        if (prev.length >= CHAT_MAX_IMAGES) {
          return prev
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            kind: 'photo',
            name: item.name,
            url: item.url,
            mediaType: mediaTypeFromFilename(item.name),
            label: formatMediaMentionLabel(item.name),
            identity: `photo:${item.name}`,
          },
        ]
      })
    },
    [status],
  )

  const handleRemovePending = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const buildSendBody = useCallback(() => {
    const pending = pendingAttachmentsRef.current
    const referencedMediaNames = pending.filter((a) => a.kind === 'photo').map((a) => a.name)
    const referencedPostMediaNames = pending.filter((a) => a.kind === 'post').map((a) => a.name)
    return {
      model: selectedChatModelRef.current,
      ...(referencedMediaNames.length > 0 ? { referencedMediaNames } : {}),
      ...(referencedPostMediaNames.length > 0 ? { referencedPostMediaNames } : {}),
    }
  }, [])

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const pending = pendingAttachmentsRef.current
      const mediaFiles: FileUIPart[] = pending.slice(0, CHAT_MAX_IMAGES).map((a) => ({
        type: 'file' as const,
        filename: a.label,
        mediaType: a.mediaType,
        url: a.url,
      }))
      const hasText = Boolean(message.text?.trim())
      const hasAttachments = mediaFiles.length > 0

      if (!(hasText || hasAttachments)) {
        return
      }

      const content = message.text?.trim() || t('sentWithAttachments')
      const body = buildSendBody()
      setText('')
      setPendingAttachments([])
      await sendMessage(
        {
          text: content,
          ...(mediaFiles.length > 0 ? { files: mediaFiles } : {}),
        },
        { body },
      )
    },
    [buildSendBody, sendMessage, t],
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
    setPendingAttachments([])
    setAgentThreadId(crypto.randomUUID())
  }, [stop, clearError, setMessages])

  const isChatBusy = status === 'streaming' || status === 'submitted'
  const isSubmitDisabled = !text.trim() && pendingAttachments.length === 0 && !isChatBusy
  const visibleMessages = useMemo(() => messages.filter((msg) => msg.role !== 'system'), [messages])

  const pendingChips = useMemo(
    () =>
      pendingAttachments.map((a) => ({
        id: a.id,
        type: 'file' as const,
        filename: a.label,
        mediaType: a.mediaType,
        url: a.url,
      })),
    [pendingAttachments],
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-4">
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
                const isActiveStream = isLast && (status === 'submitted' || status === 'streaming')
                const showFallbackSpinner = shouldShowAssistantThinkingFallback(msg, isActiveStream)

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
      <div className="shrink-0 pt-2">
        <PostCreatorChatPreviewMention
          candidate={previewCandidate}
          disabled={isChatBusy}
          excludeNames={excludeNames}
          mediaAriaLabel={t('mentionMenu.mediaAriaLabel')}
          mediaEmptyLabel={t('mentionMenu.mediaEmpty')}
          mediaGroupLabel={t('mentionMenu.mediaGroup')}
          mediaLoadingLabel={t('mentionMenu.mediaLoading')}
          mentionAriaLabel={t('mentionMenu.ariaLabel')}
          mentionEmptyLabel={t('mentionMenu.empty')}
          onSelectMedia={handleSelectMedia}
          onSelectPreview={handleSelectPreview}
          onValueChange={setText}
          previewGroupLabel={t('mentionMenu.previewGroup')}
          value={text}
        >
          <PromptInput onSubmit={handleSubmit}>
            {pendingChips.length > 0 ? (
              <Attachments
                aria-label={t('previewChipAriaLabel')}
                className="ml-0 w-full justify-start px-3 pt-3"
                variant="grid"
              >
                {pendingChips.map((chip) => (
                  <Attachment
                    className="size-16"
                    data={chip}
                    key={chip.id}
                    onRemove={() => handleRemovePending(chip.id)}
                  >
                    <AttachmentPreview />
                    <AttachmentRemove />
                  </Attachment>
                ))}
              </Attachments>
            ) : null}
            <PromptInputBody>
              <PromptInputTextarea
                onChange={handleTextChange}
                placeholder={t('placeholder')}
                value={text}
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
              <PromptInputSubmit disabled={isSubmitDisabled} onStop={stop} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </PostCreatorChatPreviewMention>
      </div>
    </div>
  )
}
