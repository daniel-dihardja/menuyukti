'use client'

import type { FileUIPart, UIMessage } from 'ai'
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
import { CHAT_STREAM_THROTTLE_MS } from '@/lib/chat/chat-stream-config'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { mediaTypeFromFilename } from '@/lib/chat/workflow-chat-media-mention'
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
  const [pendingAttachment, setPendingAttachment] = useState<PendingPreviewAttachment | null>(null)
  const pendingAttachmentRef = useRef<PendingPreviewAttachment | null>(null)
  pendingAttachmentRef.current = pendingAttachment

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

  useEffect(() => {
    setPendingAttachment((prev) => {
      if (!prev) return prev
      if (!previewCandidate || !previewIdentity) {
        return null
      }
      if (prev.identity !== previewIdentity && prev.id === PREVIEW_ATTACHMENT_ID) {
        return {
          id: PREVIEW_ATTACHMENT_ID,
          kind: previewCandidate.kind,
          name: previewCandidate.name,
          url: previewCandidate.url,
          mediaType: mediaTypeFromFilename(previewCandidate.name),
          label: previewCandidate.label,
          identity: previewIdentity,
        }
      }
      if (prev.identity === previewIdentity) {
        return {
          ...prev,
          url: previewCandidate.url,
          label: previewCandidate.label,
        }
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
      setPendingAttachment({
        id: PREVIEW_ATTACHMENT_ID,
        kind: candidate.kind,
        name: candidate.name,
        url: candidate.url,
        mediaType: mediaTypeFromFilename(candidate.name),
        label: candidate.label,
        identity: `${candidate.kind}:${candidate.name}`,
      })
    },
    [status],
  )

  const handleRemovePending = useCallback(() => {
    setPendingAttachment(null)
  }, [])

  const buildSendBody = useCallback(() => {
    const pending = pendingAttachmentRef.current
    const referencedMediaNames = pending?.kind === 'photo' ? [pending.name] : undefined
    const referencedPostMediaNames = pending?.kind === 'post' ? [pending.name] : undefined
    return {
      model: selectedChatModelRef.current,
      ...(referencedMediaNames ? { referencedMediaNames } : {}),
      ...(referencedPostMediaNames ? { referencedPostMediaNames } : {}),
    }
  }, [])

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const pending = pendingAttachmentRef.current
      const mediaFiles: FileUIPart[] = pending
        ? [
            {
              type: 'file' as const,
              filename: pending.label,
              mediaType: pending.mediaType,
              url: pending.url,
            },
          ]
        : []
      const hasText = Boolean(message.text?.trim())
      const hasAttachments = mediaFiles.length > 0

      if (!(hasText || hasAttachments)) {
        return
      }

      const content = message.text?.trim() || t('sentWithAttachments')
      const body = buildSendBody()
      setText('')
      setPendingAttachment(null)
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
    setPendingAttachment(null)
    setAgentThreadId(crypto.randomUUID())
  }, [stop, clearError, setMessages])

  const isChatBusy = status === 'streaming' || status === 'submitted'
  const isSubmitDisabled = !text.trim() && !pendingAttachment && !isChatBusy
  const visibleMessages = useMemo(() => messages.filter((msg) => msg.role !== 'system'), [messages])

  const pendingChip = useMemo(() => {
    if (!pendingAttachment) return null
    return {
      id: pendingAttachment.id,
      type: 'file' as const,
      filename: pendingAttachment.label,
      mediaType: pendingAttachment.mediaType,
      url: pendingAttachment.url,
    }
  }, [pendingAttachment])

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
                const msgText = getMessageText(msg)
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
          mentionAriaLabel={t('mentionMenu.ariaLabel')}
          mentionEmptyLabel={t('mentionMenu.empty')}
          onSelectPreview={handleSelectPreview}
          onValueChange={setText}
          value={text}
        >
          <PromptInput onSubmit={handleSubmit}>
            {pendingChip ? (
              <Attachments
                aria-label={t('previewChipAriaLabel')}
                className="ml-0 w-full justify-start px-3 pt-3"
                variant="grid"
              >
                <Attachment className="size-16" data={pendingChip} onRemove={handleRemovePending}>
                  <AttachmentPreview />
                  <AttachmentRemove />
                </Attachment>
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

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}
