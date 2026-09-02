'use client'

import type { FileUIPart, UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { apiFetch } from '@/lib/api/client-fetch'
import {
  clearAgentChatMessages,
  readAgentChatMessages,
  writeAgentChatMessages,
} from '@/lib/chat/agent-chat-message-cache'
import {
  createAgentThread,
  removeAgentThread,
  touchAgentThread,
} from '@/lib/chat/agent-thread-registry'
import { DEFAULT_CHAT_MODE, normalizeChatModeId, type ChatModeId } from '@/lib/chat/chat-modes'
import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import { CHAT_STREAM_THROTTLE_MS } from '@/lib/chat/chat-stream-config'
import { clearStoryAssetViaChat } from '@/lib/chat/clear-story-asset-via-chat'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { appendChatMention } from '@/lib/chat/append-chat-mention'
import { mediaNamesToPhotoGenerationReferences } from '@/lib/chat/media-names-to-generation-references'
import {
  ATTACHED_MEDIA_PRESIGN_MAX,
  collectAttachedPhotoFilenames,
  hydrateAttachedMediaInMessages,
} from '@/lib/chat/hydrate-attached-media-urls'
import {
  applyPresignedUrlsToMessages,
  collectGeneratedImageMediaS3Keys,
} from '@/lib/chat/refresh-generated-image-urls'
import {
  latestStoryAssetsFromMessages,
  type StoryAssetRef,
} from '@/lib/chat/story-assets-from-messages'
import {
  clearChatMentionTrigger,
  mediaTypeFromFilename,
  type PendingMediaAttachment,
} from '@/lib/chat/chat-media-mention'
import type { MediaCatalogItem } from '@/lib/media/client-api'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  isLeonardoPostModelId,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import {
  DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT,
  isChatImageAssistantFormatId,
  type ChatImageAssistantFormatId,
} from '@/lib/posts/leonardo-post-dimensions'
import type { ChatVisualizationId } from '@/lib/chat/visualization-ids'

export type { PendingMediaAttachment } from '@/lib/chat/chat-media-mention'

const AGENT_CHAT_MODE_STORAGE_PREFIX = 'menuyukti.agentChatMode.v1:'
const AGENT_CHAT_IMAGE_MODEL_STORAGE_PREFIX = 'menuyukti.agentChatImageModel.v1:'
const AGENT_CHAT_IMAGE_FORMAT_STORAGE_PREFIX = 'menuyukti.agentChatImageFormat.v1:'

function agentChatModeStorageKey(agentThreadId: string) {
  return `${AGENT_CHAT_MODE_STORAGE_PREFIX}${agentThreadId}`
}

function agentChatImageModelStorageKey(agentThreadId: string) {
  return `${AGENT_CHAT_IMAGE_MODEL_STORAGE_PREFIX}${agentThreadId}`
}

function agentChatImageFormatStorageKey(agentThreadId: string) {
  return `${AGENT_CHAT_IMAGE_FORMAT_STORAGE_PREFIX}${agentThreadId}`
}

function readStoredChatMode(agentThreadId: string): ChatModeId {
  if (typeof window === 'undefined') return DEFAULT_CHAT_MODE
  try {
    const modeRaw = sessionStorage.getItem(agentChatModeStorageKey(agentThreadId))
    if (modeRaw === null) return DEFAULT_CHAT_MODE
    const normalized = normalizeChatModeId(modeRaw)
    if (normalized === null) return DEFAULT_CHAT_MODE
    if (normalized !== modeRaw) {
      sessionStorage.setItem(agentChatModeStorageKey(agentThreadId), normalized)
    }
    return normalized
  } catch {
    return DEFAULT_CHAT_MODE
  }
}

function readStoredGenerationModel(agentThreadId: string): LeonardoPostModelId {
  if (typeof window === 'undefined') return DEFAULT_LEONARDO_POST_MODEL
  try {
    const imageModelRaw = sessionStorage.getItem(agentChatImageModelStorageKey(agentThreadId))
    return imageModelRaw !== null && isLeonardoPostModelId(imageModelRaw)
      ? imageModelRaw
      : DEFAULT_LEONARDO_POST_MODEL
  } catch {
    return DEFAULT_LEONARDO_POST_MODEL
  }
}

function readStoredImageFormat(agentThreadId: string): ChatImageAssistantFormatId {
  if (typeof window === 'undefined') return DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT
  try {
    const formatRaw = sessionStorage.getItem(agentChatImageFormatStorageKey(agentThreadId))
    return formatRaw !== null && isChatImageAssistantFormatId(formatRaw)
      ? formatRaw
      : DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT
  } catch {
    return DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT
  }
}

export type AgentChatSlashCommand = {
  id: string
  label: string
  description: string
}

export type UseAgentChatOptions = {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
  /** Persist sales-report selection on the thread (parent owns state). */
  onAnalyticsRunIdChange: (analyticsRunId: number | null) => void
  /** Called when clear chat creates a new thread id (caller should navigate). */
  onThreadRotated?: (nextThreadId: string) => void
}

export function useAgentChat({
  agentThreadId,
  locationId,
  analyticsRunId,
  onAnalyticsRunIdChange,
  onThreadRotated,
}: UseAgentChatOptions) {
  const tSlash = useTranslations('chat.slashCommands')
  const tChat = useTranslations('chat')
  const [text, setText] = useState('')
  const [pendingMediaAttachments, setPendingMediaAttachments] = useState<PendingMediaAttachment[]>(
    [],
  )
  const [storyAssetsOverride, setStoryAssetsOverride] = useState<StoryAssetRef[] | null>(null)
  const storyAssetsClearInFlightRef = useRef(false)
  const onThreadRotatedRef = useRef(onThreadRotated)
  onThreadRotatedRef.current = onThreadRotated
  const onAnalyticsRunIdChangeRef = useRef(onAnalyticsRunIdChange)
  onAnalyticsRunIdChangeRef.current = onAnalyticsRunIdChange

  const setAnalyticsRunId = useCallback((next: number | null) => {
    onAnalyticsRunIdChangeRef.current(next)
  }, [])

  const chatApiContextRef = useRef({
    agentThreadId,
    locationId,
    analyticsRunId,
  })
  const chatHydrateThreadIdRef = useRef<string | null>(null)
  const initialMessagesRef = useRef<UIMessage[]>([])
  if (chatHydrateThreadIdRef.current !== agentThreadId) {
    chatHydrateThreadIdRef.current = agentThreadId
    initialMessagesRef.current = readAgentChatMessages(agentThreadId)
  }
  const [chatMode, setChatModeState] = useState<ChatModeId>(() => readStoredChatMode(agentThreadId))
  const chatModeRef = useRef<ChatModeId>(chatMode)
  chatModeRef.current = chatMode
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const selectedChatModelRef = useRef<ChatGatewayModelId>(DEFAULT_CHAT_GATEWAY_MODEL)
  selectedChatModelRef.current = selectedChatModel
  const [selectedGenerationModel, setSelectedGenerationModelState] = useState<LeonardoPostModelId>(
    () => readStoredGenerationModel(agentThreadId),
  )
  const selectedGenerationModelRef = useRef<LeonardoPostModelId>(selectedGenerationModel)
  selectedGenerationModelRef.current = selectedGenerationModel
  const [selectedImageFormat, setSelectedImageFormatState] = useState<ChatImageAssistantFormatId>(
    () => readStoredImageFormat(agentThreadId),
  )
  const selectedImageFormatRef = useRef<ChatImageAssistantFormatId>(selectedImageFormat)
  selectedImageFormatRef.current = selectedImageFormat
  const pendingReferencedVisualizationIdRef = useRef<ChatVisualizationId | null>(null)
  const pendingMediaAttachmentsRef = useRef<PendingMediaAttachment[]>([])
  pendingMediaAttachmentsRef.current = pendingMediaAttachments
  chatApiContextRef.current = {
    agentThreadId,
    locationId,
    analyticsRunId,
  }

  useEffect(() => {
    const nextMode = readStoredChatMode(agentThreadId)
    setChatModeState(nextMode)
    chatModeRef.current = nextMode
    const nextImageModel = readStoredGenerationModel(agentThreadId)
    setSelectedGenerationModelState(nextImageModel)
    selectedGenerationModelRef.current = nextImageModel
    const nextImageFormat = readStoredImageFormat(agentThreadId)
    setSelectedImageFormatState(nextImageFormat)
    selectedImageFormatRef.current = nextImageFormat
  }, [agentThreadId])

  useEffect(() => {
    touchAgentThread(agentThreadId, { locationId, analyticsRunId })
  }, [agentThreadId, locationId, analyticsRunId])

  const setSelectedGenerationModel = useCallback(
    (model: LeonardoPostModelId) => {
      setSelectedGenerationModelState(model)
      selectedGenerationModelRef.current = model
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(agentChatImageModelStorageKey(agentThreadId), model)
      }
    },
    [agentThreadId],
  )

  const setSelectedImageFormat = useCallback(
    (format: ChatImageAssistantFormatId) => {
      setSelectedImageFormatState(format)
      selectedImageFormatRef.current = format
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(agentChatImageFormatStorageKey(agentThreadId), format)
      }
    },
    [agentThreadId],
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body: mergedBody }) => {
          const ctx = chatApiContextRef.current
          const lastUser = [...messages].reverse().find((m) => m.role === 'user')
          const merged = mergedBody as Record<string, unknown> | undefined
          return {
            body: {
              ...mergedBody,
              messages: lastUser ? [lastUser] : messages,
              agentThreadId: ctx.agentThreadId,
              locationId: String(ctx.locationId),
              ...(ctx.analyticsRunId !== null
                ? { analyticsRunId: String(ctx.analyticsRunId) }
                : {}),
              model:
                typeof merged?.model === 'string' ? merged.model : selectedChatModelRef.current,
              generationModel:
                typeof merged?.generationModel === 'string' &&
                isLeonardoPostModelId(merged.generationModel)
                  ? merged.generationModel
                  : selectedGenerationModelRef.current,
              imageFormat:
                typeof merged?.imageFormat === 'string' &&
                isChatImageAssistantFormatId(merged.imageFormat)
                  ? merged.imageFormat
                  : selectedImageFormatRef.current,
              chatMode: chatModeRef.current,
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate, setMessages } =
    useChat({
      id: agentThreadId,
      messages: initialMessagesRef.current,
      transport,
      experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    })

  useEffect(() => {
    if (status !== 'ready' && status !== 'error') {
      return
    }
    writeAgentChatMessages(agentThreadId, messages)
    touchAgentThread(agentThreadId)
  }, [agentThreadId, status, messages])

  useEffect(() => {
    let cancelled = false

    async function refreshGeneratedImageUrls(source: UIMessage[]) {
      const keys = collectGeneratedImageMediaS3Keys(source).slice(0, 32)
      if (keys.length === 0 || cancelled) {
        return
      }
      const result = await apiFetch<{ urls?: Record<string, string> }>(
        '/api/media/presign-posts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys }),
        },
        'Failed to refresh image URLs',
      )
      if (cancelled || !result.ok) {
        return
      }
      const urls = result.data.urls
      if (!urls || typeof urls !== 'object') {
        return
      }
      let rewritten: UIMessage[] | null = null
      setMessages((current) => {
        rewritten = applyPresignedUrlsToMessages(current, urls)
        return rewritten
      })
      if (rewritten !== null) {
        writeAgentChatMessages(agentThreadId, rewritten)
      }
    }

    async function refreshAttachedPhotoUrls(source: UIMessage[]) {
      const names = collectAttachedPhotoFilenames(source).slice(0, ATTACHED_MEDIA_PRESIGN_MAX)
      if (names.length === 0 || cancelled) {
        return
      }
      const result = await apiFetch<{ urls?: Record<string, string> }>(
        '/api/media/presign-photos',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names }),
        },
        'Failed to refresh attached photo URLs',
      )
      if (cancelled || !result.ok) {
        return
      }
      const urls = result.data.urls
      if (!urls || typeof urls !== 'object') {
        return
      }
      let rewritten: UIMessage[] | null = null
      setMessages((current) => {
        rewritten = hydrateAttachedMediaInMessages(current, urls)
        return rewritten
      })
      if (rewritten !== null) {
        writeAgentChatMessages(agentThreadId, rewritten)
      }
    }

    void (async () => {
      let messagesToRefresh = initialMessagesRef.current
      const history = await apiFetch<{
        messages?: UIMessage[]
        storyAssets?: StoryAssetRef[]
      }>(
        `/api/chat/history?agentThreadId=${encodeURIComponent(agentThreadId)}`,
        { cache: 'no-store' },
        'Failed to load chat history',
      )
      if (cancelled) {
        return
      }
      if (history.ok && Array.isArray(history.data.messages) && history.data.messages.length > 0) {
        const historyMessages = history.data.messages
        setMessages(historyMessages)
        writeAgentChatMessages(agentThreadId, historyMessages)
        messagesToRefresh = historyMessages
      }
      if (history.ok && Array.isArray(history.data.storyAssets)) {
        setStoryAssetsOverride(history.data.storyAssets)
      }
      await Promise.all([
        refreshGeneratedImageUrls(messagesToRefresh),
        refreshAttachedPhotoUrls(messagesToRefresh),
      ])
      if (cancelled) {
        return
      }
    })()

    return () => {
      cancelled = true
    }
  }, [agentThreadId, setMessages])

  const slashCommands = useMemo(
    (): AgentChatSlashCommand[] => [
      {
        id: 'image',
        label: tSlash('image.label'),
        description: tSlash('image.description'),
      },
      {
        id: 'story',
        label: tSlash('story.label'),
        description: tSlash('story.description'),
      },
    ],
    [tSlash],
  )

  const buildSendBody = useCallback(() => {
    const vizRef = pendingReferencedVisualizationIdRef.current
    const pending = pendingMediaAttachmentsRef.current
    const photoNames = pending.filter((m) => m.kind === 'photo').map((m) => m.name)
    const generationReferences = mediaNamesToPhotoGenerationReferences(photoNames)
    pendingReferencedVisualizationIdRef.current = null
    return {
      model: selectedChatModelRef.current,
      generationModel: selectedGenerationModelRef.current,
      imageFormat: selectedImageFormatRef.current,
      ...(vizRef !== null ? { referencedVisualizationId: vizRef } : {}),
      ...(photoNames.length > 0 ? { referencedMediaNames: photoNames } : {}),
      ...(generationReferences.length > 0 ? { generationReferences } : {}),
    }
  }, [])

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }, [])

  const handleSelectMediaMention = useCallback(
    (item: MediaCatalogItem) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      setPendingMediaAttachments((prev) => {
        if (prev.some((m) => m.kind === 'photo' && m.name === item.name)) {
          return prev
        }
        if (prev.length >= CHAT_MAX_IMAGES) {
          return prev
        }
        const mediaType = mediaTypeFromFilename(item.name)
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            kind: 'photo',
            name: item.name,
            url: item.url,
            mediaType,
          },
        ]
      })
      setText((current) => clearChatMentionTrigger(current))
    },
    [status],
  )

  const handleRemovePendingMedia = useCallback((id: string) => {
    setPendingMediaAttachments((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const storyAssetsFromMessages = useMemo(() => latestStoryAssetsFromMessages(messages), [messages])
  const storyAssetsFromMessagesKey = useMemo(
    () => JSON.stringify(storyAssetsFromMessages),
    [storyAssetsFromMessages],
  )

  useEffect(() => {
    setStoryAssetsOverride(null)
  }, [storyAssetsFromMessagesKey])

  const savedStoryAssets = storyAssetsOverride ?? storyAssetsFromMessages

  const handleRemoveSavedStoryAsset = useCallback(
    (name: string) => {
      if (status === 'streaming' || status === 'submitted' || storyAssetsClearInFlightRef.current) {
        return
      }
      const previous = savedStoryAssets
      const optimistic = previous.filter((a) => a.name !== name)
      setStoryAssetsOverride(optimistic)
      storyAssetsClearInFlightRef.current = true
      const ctx = chatApiContextRef.current
      void clearStoryAssetViaChat({
        name,
        agentThreadId: ctx.agentThreadId,
        locationId: ctx.locationId,
        analyticsRunId: ctx.analyticsRunId,
        chatMode: chatModeRef.current,
        model: selectedChatModelRef.current,
      })
        .then((snapshot) => {
          setStoryAssetsOverride(snapshot)
        })
        .catch(() => {
          setStoryAssetsOverride(previous)
        })
        .finally(() => {
          storyAssetsClearInFlightRef.current = false
        })
    },
    [savedStoryAssets, status],
  )

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const mediaFiles: FileUIPart[] = pendingMediaAttachmentsRef.current.map((m) => ({
        type: 'file' as const,
        filename: m.name,
        mediaType: m.mediaType,
        url: m.url,
      }))
      const uploadFiles = message.files ?? []
      const allFiles = [...uploadFiles, ...mediaFiles].slice(0, CHAT_MAX_IMAGES)
      const hasText = Boolean(message.text?.trim())
      const hasAttachments = allFiles.length > 0

      if (!(hasText || hasAttachments)) {
        return
      }

      const content = message.text?.trim() || tChat('sentWithAttachments')
      const body = buildSendBody()
      setText('')
      setPendingMediaAttachments([])
      await sendMessage(
        {
          text: content,
          ...(allFiles.length > 0 ? { files: allFiles } : {}),
        },
        { body },
      )
    },
    [sendMessage, buildSendBody, tChat],
  )

  const sendQuickReply = useCallback(
    async (text: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      const content = text.trim()
      if (!content) {
        return
      }
      const body = buildSendBody()
      setText('')
      setPendingMediaAttachments([])
      await sendMessage({ text: content }, { body })
    },
    [sendMessage, buildSendBody, status],
  )

  const handleSelectVisualizationMention = useCallback(
    (visualizationId: ChatVisualizationId, title: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      pendingReferencedVisualizationIdRef.current = visualizationId
      setText((current) => appendChatMention(current, title))
    },
    [status],
  )

  const handleRetry = useCallback(async () => {
    clearError()
    await regenerate()
  }, [clearError, regenerate])

  const clearLocalChatState = useCallback(() => {
    stop()
    clearError()
    clearAgentChatMessages(agentThreadId)
    setMessages([])
    setText('')
    setPendingMediaAttachments([])
    setStoryAssetsOverride(null)
    pendingReferencedVisualizationIdRef.current = null
  }, [agentThreadId, stop, clearError, setMessages])

  const handleClearChat = useCallback(() => {
    const ctx = chatApiContextRef.current
    clearLocalChatState()
    const nextId = crypto.randomUUID()
    createAgentThread({
      id: nextId,
      locationId: ctx.locationId,
      analyticsRunId: ctx.analyticsRunId,
    })
    removeAgentThread(agentThreadId)
    void fetch(`/api/chat/history?agentThreadId=${encodeURIComponent(agentThreadId)}`, {
      method: 'DELETE',
    }).catch(() => {
      /* best-effort */
    })
    onThreadRotatedRef.current?.(nextId)
  }, [agentThreadId, clearLocalChatState])

  const setChatMode = useCallback(
    (next: ChatModeId) => {
      if (next === chatModeRef.current) {
        return
      }
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      setChatModeState(next)
      chatModeRef.current = next
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(agentChatModeStorageKey(agentThreadId), next)
      }
    },
    [status, agentThreadId],
  )

  const handleSelectSlashCommand = useCallback(
    async (command: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      if (command === '/image' || command === '/story') {
        setText('')
        setChatMode('image_assistant')
        if (command === '/story') {
          setSelectedImageFormat('story')
        }
        return
      }
      setText('')
      await sendMessage(
        { text: command },
        {
          body: {
            model: selectedChatModelRef.current,
            generationModel: selectedGenerationModelRef.current,
            imageFormat: selectedImageFormatRef.current,
          },
        },
      )
    },
    [sendMessage, setChatMode, setSelectedImageFormat, status],
  )

  const isChatBusy = status === 'streaming' || status === 'submitted'
  const isSubmitDisabled = !text.trim() && pendingMediaAttachments.length === 0 && !isChatBusy
  const visibleMessages = useMemo(() => messages.filter((msg) => msg.role !== 'system'), [messages])

  const messagesState = useMemo(
    () => ({
      visibleMessages,
      status,
      error,
      isChatBusy,
      hasMessages: messages.length > 0,
    }),
    [visibleMessages, status, error, isChatBusy, messages.length],
  )

  const composerState = useMemo(
    () => ({
      text,
      chatMode,
      selectedChatModel,
      selectedGenerationModel,
      selectedImageFormat,
      locationId,
      analyticsRunId,
      isSubmitDisabled,
      slashCommands,
      pendingMediaAttachments,
      savedStoryAssets,
    }),
    [
      text,
      chatMode,
      selectedChatModel,
      selectedGenerationModel,
      selectedImageFormat,
      locationId,
      analyticsRunId,
      isSubmitDisabled,
      slashCommands,
      pendingMediaAttachments,
      savedStoryAssets,
    ],
  )

  const actions = useMemo(
    () => ({
      setText,
      setChatMode,
      setSelectedChatModel,
      setSelectedGenerationModel,
      setSelectedImageFormat,
      setAnalyticsRunId,
      handleTextChange,
      handleSubmit,
      sendQuickReply,
      handleSelectSlashCommand,
      handleSelectVisualizationMention,
      handleSelectMediaMention,
      handleRemovePendingMedia,
      handleRemoveSavedStoryAsset,
      handleRetry,
      handleClearChat,
      stop,
    }),
    [
      setChatMode,
      setSelectedGenerationModel,
      setSelectedImageFormat,
      setAnalyticsRunId,
      handleTextChange,
      handleSubmit,
      sendQuickReply,
      handleSelectSlashCommand,
      handleSelectVisualizationMention,
      handleSelectMediaMention,
      handleRemovePendingMedia,
      handleRemoveSavedStoryAsset,
      handleRetry,
      handleClearChat,
      stop,
    ],
  )

  return {
    messagesState,
    composerState,
    actions,
  }
}
