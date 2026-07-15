'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CHAT_STREAM_THROTTLE_MS } from '@/lib/chat/chat-stream-config'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { appendWorkflowChatMention } from '@/lib/chat/append-workflow-chat-mention'
import type { WorkflowVisualizationId } from '@/lib/workflow/workflow-visualization-ids'

const WORKFLOW_CHAT_SESSION_STORAGE_PREFIX = 'menuyukti.wfChatSession.v1:'

function workflowChatSessionStorageKey(workflowId: string) {
  return `${WORKFLOW_CHAT_SESSION_STORAGE_PREFIX}${workflowId}`
}

const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

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
}

export function useWorkflowChat({
  workflowId,
  locationId,
  analyticsRunId,
  selectedMilestoneId,
  milestoneTitles,
  onHydrateAfterChat,
  onPrefetchMilestoneReference,
}: UseWorkflowChatOptions) {
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const [text, setText] = useState('')

  const chatApiContextRef = useRef({
    workflowId,
    locationId,
    analyticsRunId,
    milestoneId: selectedMilestoneId,
  })
  const workflowChatSessionIdRef = useRef<string | null>(null)
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const selectedChatModelRef = useRef<ChatGatewayModelId>(DEFAULT_CHAT_GATEWAY_MODEL)
  selectedChatModelRef.current = selectedChatModel
  const pendingPresetReferenceMilestoneIdRef = useRef<string | null>(null)
  const pendingReferencedVisualizationIdRef = useRef<WorkflowVisualizationId | null>(null)
  chatApiContextRef.current = {
    workflowId,
    locationId,
    analyticsRunId,
    milestoneId: selectedMilestoneId,
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const raw = sessionStorage.getItem(workflowChatSessionStorageKey(workflowId))
    workflowChatSessionIdRef.current = raw !== null && UUID_RE.test(raw) ? raw : null
  }, [workflowId])

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
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate, setMessages } =
    useChat({
      id: workflowId,
      transport,
      experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    })

  const slashCommands = useMemo(
    (): WorkflowChatSlashCommand[] => [
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
    if (chatWasBusy.current && !busy && error == null && selectedMilestoneId !== null) {
      onHydrateAfterChat(selectedMilestoneId)
    }
    chatWasBusy.current = busy
  }, [status, error, selectedMilestoneId, onHydrateAfterChat])

  const buildSendBody = useCallback(() => {
    const presetRef = pendingPresetReferenceMilestoneIdRef.current
    const vizRef = pendingReferencedVisualizationIdRef.current
    pendingPresetReferenceMilestoneIdRef.current = null
    pendingReferencedVisualizationIdRef.current = null
    return {
      model: selectedChatModelRef.current,
      ...(presetRef !== null ? { presetReferenceMilestoneId: presetRef } : {}),
      ...(vizRef !== null ? { referencedVisualizationId: vizRef } : {}),
    }
  }, [])

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim())
      const hasAttachments = Boolean(message.files?.length)

      if (!(hasText || hasAttachments)) {
        return
      }

      const content = message.text?.trim() || 'Sent with attachments'
      setText('')
      await sendMessage(
        {
          text: content,
          ...(message.files?.length ? { files: message.files } : {}),
        },
        { body: buildSendBody() },
      )
    },
    [sendMessage, buildSendBody],
  )

  const handleSelectSlashCommand = useCallback(
    async (command: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      setText('')
      await sendMessage({ text: command }, { body: { model: selectedChatModelRef.current } })
    },
    [sendMessage, status],
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

  const handleClearChat = useCallback(() => {
    stop()
    clearError()
    setMessages([])
    setText('')
    pendingPresetReferenceMilestoneIdRef.current = null
    pendingReferencedVisualizationIdRef.current = null
    const sid = crypto.randomUUID()
    workflowChatSessionIdRef.current = sid
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(workflowChatSessionStorageKey(workflowId), sid)
    }
  }, [workflowId, stop, clearError, setMessages])

  const isChatBusy = status === 'streaming' || status === 'submitted'
  const isSubmitDisabled = !text.trim() && !isChatBusy
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
      selectedChatModel,
      isSubmitDisabled,
      slashCommands,
    }),
    [text, selectedChatModel, isSubmitDisabled, slashCommands],
  )

  const actions = useMemo(
    () => ({
      setText,
      setSelectedChatModel,
      handleTextChange,
      handleSubmit,
      handleSelectSlashCommand,
      handleSelectMention,
      handleSelectVisualizationMention,
      handleRetry,
      handleClearChat,
      stop,
    }),
    [
      handleTextChange,
      handleSubmit,
      handleSelectSlashCommand,
      handleSelectMention,
      handleSelectVisualizationMention,
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
