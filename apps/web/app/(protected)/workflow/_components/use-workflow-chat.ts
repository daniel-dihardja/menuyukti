'use client'

import type { FileUIPart, UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { apiFetch } from '@/lib/api/client-fetch'
import { DEFAULT_CHAT_MODE, isChatModeId, type ChatModeId } from '@/lib/chat/chat-modes'
import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import { CHAT_STREAM_THROTTLE_MS } from '@/lib/chat/chat-stream-config'
import { clearStoryAssetViaChat } from '@/lib/chat/clear-story-asset-via-chat'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { appendWorkflowChatMention } from '@/lib/chat/append-workflow-chat-mention'
import { mediaNamesToPhotoGenerationReferences } from '@/lib/chat/media-names-to-generation-references'
import {
  applyPresignedUrlsToMessages,
  collectGeneratedImageMediaS3Keys,
} from '@/lib/chat/refresh-generated-image-urls'
import {
  latestStoryAssetsFromMessages,
  type StoryAssetRef,
} from '@/lib/chat/story-assets-from-messages'
import {
  clearWorkflowChatMessages,
  readWorkflowChatMessages,
  writeWorkflowChatMessages,
} from '@/lib/chat/workflow-chat-message-cache'
import {
  clearWorkflowChatMentionTrigger,
  mediaTypeFromFilename,
  type PendingMediaAttachment,
} from '@/lib/chat/workflow-chat-media-mention'
import type { MediaCatalogItem } from '@/lib/media/client-api'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  isLeonardoPostModelId,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import type { WorkflowVisualizationId } from '@/lib/workflow/workflow-visualization-ids'

export type { PendingMediaAttachment } from '@/lib/chat/workflow-chat-media-mention'

const WORKFLOW_CHAT_SESSION_STORAGE_PREFIX = 'menuyukti.wfChatSession.v1:'
const WORKFLOW_CHAT_MODE_STORAGE_PREFIX = 'menuyukti.wfChatMode.v1:'
const WORKFLOW_CHAT_IMAGE_MODEL_STORAGE_PREFIX = 'menuyukti.wfChatImageModel.v1:'

function workflowChatSessionStorageKey(workflowId: string) {
  return `${WORKFLOW_CHAT_SESSION_STORAGE_PREFIX}${workflowId}`
}

function workflowChatModeStorageKey(workflowId: string) {
  return `${WORKFLOW_CHAT_MODE_STORAGE_PREFIX}${workflowId}`
}

function workflowChatImageModelStorageKey(workflowId: string) {
  return `${WORKFLOW_CHAT_IMAGE_MODEL_STORAGE_PREFIX}${workflowId}`
}

const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

function readWorkflowChatSessionId(workflowId: string): string | null {
  if (typeof window === 'undefined') return null
  const key = workflowChatSessionStorageKey(workflowId)
  try {
    const fromLocal = localStorage.getItem(key)
    if (fromLocal !== null && UUID_RE.test(fromLocal)) {
      return fromLocal
    }
    // Migrate per-tab sessionStorage → cross-tab localStorage (step 3).
    const fromSession = sessionStorage.getItem(key)
    if (fromSession !== null && UUID_RE.test(fromSession)) {
      localStorage.setItem(key, fromSession)
      sessionStorage.removeItem(key)
      return fromSession
    }
  } catch {
    return null
  }
  return null
}

/** Always returns a stable session UUID (creates + persists to localStorage when missing). */
function ensureWorkflowChatSessionId(workflowId: string): string {
  const existing = readWorkflowChatSessionId(workflowId)
  if (existing !== null) {
    return existing
  }
  const sid = crypto.randomUUID()
  try {
    localStorage.setItem(workflowChatSessionStorageKey(workflowId), sid)
  } catch {
    /* ignore quota / private mode */
  }
  return sid
}

function writeWorkflowChatSessionId(workflowId: string, sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(workflowChatSessionStorageKey(workflowId), sessionId)
    sessionStorage.removeItem(workflowChatSessionStorageKey(workflowId))
  } catch {
    /* ignore */
  }
}

function readStoredChatMode(workflowId: string): ChatModeId {
  if (typeof window === 'undefined') return DEFAULT_CHAT_MODE
  try {
    const modeRaw = sessionStorage.getItem(workflowChatModeStorageKey(workflowId))
    return modeRaw !== null && isChatModeId(modeRaw) ? modeRaw : DEFAULT_CHAT_MODE
  } catch {
    return DEFAULT_CHAT_MODE
  }
}

function readStoredGenerationModel(workflowId: string): LeonardoPostModelId {
  if (typeof window === 'undefined') return DEFAULT_LEONARDO_POST_MODEL
  try {
    const imageModelRaw = sessionStorage.getItem(workflowChatImageModelStorageKey(workflowId))
    return imageModelRaw !== null && isLeonardoPostModelId(imageModelRaw)
      ? imageModelRaw
      : DEFAULT_LEONARDO_POST_MODEL
  } catch {
    return DEFAULT_LEONARDO_POST_MODEL
  }
}

export type WorkflowChatSlashCommand = {
  id: string
  label: string
  description: string
}

export type UseWorkflowChatOptions = {
  workflowId: string
  locationId: number
  analyticsRunId: number | null
  selectedMilestoneId: string | null
  milestoneTitles: ReadonlyArray<{ id: string; title: string | null | undefined }>
  onHydrateAfterChat: (milestoneId: string) => void
  onPrefetchMilestoneReference?: (milestoneId: string) => void
  /** Called when a chat turn finishes successfully (refetch Instagram items panel). */
  onRefreshInstagramItems?: () => void
}

export function useWorkflowChat({
  workflowId,
  locationId,
  analyticsRunId,
  selectedMilestoneId,
  milestoneTitles,
  onHydrateAfterChat,
  onPrefetchMilestoneReference,
  onRefreshInstagramItems,
}: UseWorkflowChatOptions) {
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const [text, setText] = useState('')
  const [pendingMediaAttachments, setPendingMediaAttachments] = useState<PendingMediaAttachment[]>(
    [],
  )
  const [storyAssetsOverride, setStoryAssetsOverride] = useState<StoryAssetRef[] | null>(null)
  const storyAssetsClearInFlightRef = useRef(false)

  const chatApiContextRef = useRef({
    workflowId,
    locationId,
    analyticsRunId,
    milestoneId: selectedMilestoneId,
  })
  const workflowChatSessionIdRef = useRef<string | null>(null)
  const chatHydrateWorkflowIdRef = useRef<string | null>(null)
  const initialMessagesRef = useRef<UIMessage[]>([])
  // Sync hydrate when workflowId changes so useChat receives cached messages on create.
  if (chatHydrateWorkflowIdRef.current !== workflowId) {
    chatHydrateWorkflowIdRef.current = workflowId
    const sessionId = ensureWorkflowChatSessionId(workflowId)
    workflowChatSessionIdRef.current = sessionId
    initialMessagesRef.current = readWorkflowChatMessages(workflowId, sessionId)
  }
  const [chatMode, setChatModeState] = useState<ChatModeId>(() => readStoredChatMode(workflowId))
  const chatModeRef = useRef<ChatModeId>(chatMode)
  chatModeRef.current = chatMode
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const selectedChatModelRef = useRef<ChatGatewayModelId>(DEFAULT_CHAT_GATEWAY_MODEL)
  selectedChatModelRef.current = selectedChatModel
  const [selectedGenerationModel, setSelectedGenerationModelState] = useState<LeonardoPostModelId>(
    () => readStoredGenerationModel(workflowId),
  )
  const selectedGenerationModelRef = useRef<LeonardoPostModelId>(selectedGenerationModel)
  selectedGenerationModelRef.current = selectedGenerationModel
  const pendingPresetReferenceMilestoneIdRef = useRef<string | null>(null)
  const pendingReferencedVisualizationIdRef = useRef<WorkflowVisualizationId | null>(null)
  const pendingMediaAttachmentsRef = useRef<PendingMediaAttachment[]>([])
  pendingMediaAttachmentsRef.current = pendingMediaAttachments
  chatApiContextRef.current = {
    workflowId,
    locationId,
    analyticsRunId,
    milestoneId: selectedMilestoneId,
  }

  useEffect(() => {
    const nextMode = readStoredChatMode(workflowId)
    setChatModeState(nextMode)
    chatModeRef.current = nextMode
    const nextImageModel = readStoredGenerationModel(workflowId)
    setSelectedGenerationModelState(nextImageModel)
    selectedGenerationModelRef.current = nextImageModel
  }, [workflowId])

  const setSelectedGenerationModel = useCallback(
    (model: LeonardoPostModelId) => {
      setSelectedGenerationModelState(model)
      selectedGenerationModelRef.current = model
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(workflowChatImageModelStorageKey(workflowId), model)
      }
    },
    [workflowId],
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body: mergedBody }) => {
          const ctx = chatApiContextRef.current
          const lastUser = [...messages].reverse().find((m) => m.role === 'user')
          const sessionId = workflowChatSessionIdRef.current
          const merged = mergedBody as Record<string, unknown> | undefined
          return {
            body: {
              ...mergedBody,
              messages: lastUser ? [lastUser] : messages,
              workflowId: ctx.workflowId,
              locationId: String(ctx.locationId),
              ...(ctx.milestoneId !== null ? { milestoneId: ctx.milestoneId } : {}),
              ...(ctx.analyticsRunId !== null
                ? { analyticsRunId: String(ctx.analyticsRunId) }
                : {}),
              ...(sessionId !== null ? { workflowChatSessionId: sessionId } : {}),
              model:
                typeof merged?.model === 'string' ? merged.model : selectedChatModelRef.current,
              generationModel:
                typeof merged?.generationModel === 'string' &&
                isLeonardoPostModelId(merged.generationModel)
                  ? merged.generationModel
                  : selectedGenerationModelRef.current,
              chatMode: chatModeRef.current,
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate, setMessages } =
    useChat({
      id: workflowId,
      messages: initialMessagesRef.current,
      transport,
      experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    })

  useEffect(() => {
    if (status !== 'ready' && status !== 'error') {
      return
    }
    writeWorkflowChatMessages(workflowId, workflowChatSessionIdRef.current, messages)
  }, [workflowId, status, messages])

  // Server history (authoritative) then re-presign generated image URLs.
  useEffect(() => {
    const sessionId = workflowChatSessionIdRef.current
    if (sessionId === null) {
      return
    }

    let cancelled = false

    async function refreshPresignedUrls(source: UIMessage[]) {
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
        writeWorkflowChatMessages(workflowId, workflowChatSessionIdRef.current, rewritten)
      }
    }

    void (async () => {
      let messagesToRefresh = initialMessagesRef.current
      const history = await apiFetch<{
        messages?: UIMessage[]
        storyAssets?: StoryAssetRef[]
      }>(
        `/api/chat/history?workflowId=${encodeURIComponent(workflowId)}&workflowChatSessionId=${encodeURIComponent(sessionId)}`,
        { cache: 'no-store' },
        'Failed to load chat history',
      )
      if (cancelled) {
        return
      }
      if (history.ok && Array.isArray(history.data.messages) && history.data.messages.length > 0) {
        const historyMessages = history.data.messages
        setMessages(historyMessages)
        writeWorkflowChatMessages(workflowId, sessionId, historyMessages)
        messagesToRefresh = historyMessages
      }
      await refreshPresignedUrls(messagesToRefresh)
    })()

    return () => {
      cancelled = true
    }
  }, [workflowId, setMessages])

  const slashCommands = useMemo(
    (): WorkflowChatSlashCommand[] => [
      {
        id: 'story',
        label: tSlash('story.label'),
        description: tSlash('story.description'),
      },
      {
        id: 'input',
        label: tSlash('input.label'),
        description: tSlash('input.description'),
      },
      {
        id: 'data',
        label: tSlash('data.label'),
        description: tSlash('data.description'),
      },
      {
        id: 'help',
        label: tSlash('help.label'),
        description: tSlash('help.description'),
      },
    ],
    [tSlash],
  )

  const chatWasBusy = useRef(false)
  useEffect(() => {
    const busy = status === 'streaming' || status === 'submitted'
    if (chatWasBusy.current && !busy && error == null) {
      if (selectedMilestoneId !== null) {
        onHydrateAfterChat(selectedMilestoneId)
      }
      onRefreshInstagramItems?.()
    }
    chatWasBusy.current = busy
  }, [status, error, selectedMilestoneId, onHydrateAfterChat, onRefreshInstagramItems])

  const buildSendBody = useCallback(() => {
    const presetRef = pendingPresetReferenceMilestoneIdRef.current
    const vizRef = pendingReferencedVisualizationIdRef.current
    const pending = pendingMediaAttachmentsRef.current
    const photoNames = pending.filter((m) => m.kind === 'photo').map((m) => m.name)
    const generationReferences = mediaNamesToPhotoGenerationReferences(photoNames)
    pendingPresetReferenceMilestoneIdRef.current = null
    pendingReferencedVisualizationIdRef.current = null
    return {
      model: selectedChatModelRef.current,
      generationModel: selectedGenerationModelRef.current,
      ...(presetRef !== null ? { presetReferenceMilestoneId: presetRef } : {}),
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
      setText((current) => clearWorkflowChatMentionTrigger(current))
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
        workflowId: ctx.workflowId,
        locationId: ctx.locationId,
        milestoneId: ctx.milestoneId,
        analyticsRunId: ctx.analyticsRunId,
        workflowChatSessionId: workflowChatSessionIdRef.current,
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

      const content = message.text?.trim() || 'Sent with attachments'
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
    [sendMessage, buildSendBody],
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

  const handleSelectMention = useCallback(
    (milestoneId: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      const rawTitle = milestoneTitles.find((m) => m.id === milestoneId)?.title?.trim() ?? ''
      const label = rawTitle.length > 0 ? rawTitle.replace(/\s+/g, ' ') : milestoneId
      pendingPresetReferenceMilestoneIdRef.current = milestoneId
      onPrefetchMilestoneReference?.(milestoneId)
      setText((current) => appendWorkflowChatMention(current, label))
    },
    [milestoneTitles, onPrefetchMilestoneReference, status],
  )

  const handleSelectVisualizationMention = useCallback(
    (visualizationId: WorkflowVisualizationId, title: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      pendingReferencedVisualizationIdRef.current = visualizationId
      setText((current) => appendWorkflowChatMention(current, title))
    },
    [status],
  )

  const handleRetry = useCallback(async () => {
    clearError()
    await regenerate()
  }, [clearError, regenerate])

  const rotateChatSession = useCallback(() => {
    stop()
    clearError()
    clearWorkflowChatMessages(workflowId, workflowChatSessionIdRef.current)
    setMessages([])
    setText('')
    setPendingMediaAttachments([])
    setStoryAssetsOverride(null)
    pendingPresetReferenceMilestoneIdRef.current = null
    pendingReferencedVisualizationIdRef.current = null
    const sid = crypto.randomUUID()
    workflowChatSessionIdRef.current = sid
    writeWorkflowChatSessionId(workflowId, sid)
  }, [workflowId, stop, clearError, setMessages])

  const handleClearChat = useCallback(() => {
    rotateChatSession()
  }, [rotateChatSession])

  const setChatMode = useCallback(
    (next: ChatModeId) => {
      if (next === chatModeRef.current) {
        return
      }
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      rotateChatSession()
      setChatModeState(next)
      chatModeRef.current = next
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(workflowChatModeStorageKey(workflowId), next)
      }
    },
    [rotateChatSession, status, workflowId],
  )

  const handleSelectSlashCommand = useCallback(
    async (command: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      if (command === '/story') {
        setText('')
        setChatMode('story_image_assistant')
        return
      }
      setText('')
      await sendMessage(
        { text: command },
        {
          body: {
            model: selectedChatModelRef.current,
            generationModel: selectedGenerationModelRef.current,
          },
        },
      )
    },
    [sendMessage, setChatMode, status],
  )

  const isChatBusy = status === 'streaming' || status === 'submitted'
  /** True when the composer has no text and no pending media library chips (upload files are checked in the submit control). */
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
      handleTextChange,
      handleSubmit,
      sendQuickReply,
      handleSelectSlashCommand,
      handleSelectMention,
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
      handleTextChange,
      handleSubmit,
      sendQuickReply,
      handleSelectSlashCommand,
      handleSelectMention,
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

export function getWorkflowMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}
