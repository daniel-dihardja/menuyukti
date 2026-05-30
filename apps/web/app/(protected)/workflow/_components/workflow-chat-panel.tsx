'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
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
import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { usePanelRef } from '@workspace/ui/components/resizable'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { PanelRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'
import { useSearchParams } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import type { TimelineMilestone } from './timeline-workspace'
import { TimelineWorkspace } from './timeline-workspace'
import { WorkflowChatLayout } from './workflow-chat-layout'
import { WorkflowChatMessageParts } from './workflow-chat-message-parts'
import { WorkflowChatMentionProvider } from './workflow-chat-mention-context'

import {
  workflowMilestoneReducer,
  createInitialWorkflowMilestoneUiState,
} from './workflow-milestone-reducer'
import { TimelineProvider } from './timeline-context'
import { useWorkflowPreviewVisibility } from './use-workflow-preview-visibility'
import { useWorkflowTimelineProviderSlices } from './use-workflow-timeline-provider-value'
import { useMilestoneOperations } from './use-milestone-operations'
import { WorkflowChatComposerMenus } from './workflow-chat-composer-menus'
import { WorkflowPreviewPanelSkeleton } from './workflow-workspace-skeleton'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

const WORKFLOW_CHAT_SESSION_STORAGE_PREFIX = 'menuyukti.wfChatSession.v1:'

function workflowChatSessionStorageKey(workflowId: string) {
  return `${WORKFLOW_CHAT_SESSION_STORAGE_PREFIX}${workflowId}`
}

const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

/** Code-split preview; collapsible panel keeps the subtree mounted when hidden on desktop. */
const WorkflowPreviewPanelBodyLazy = dynamic(
  () => import('./workflow-preview-panel-body').then((m) => m.WorkflowPreviewPanelBody),
  {
    ssr: false,
    loading: () => <WorkflowPreviewPanelSkeleton className="h-full w-full" />,
  },
)

function WorkflowPreviewToggleButton() {
  const tWorkspace = useTranslations('analytics.workflows.workspace')
  const [isPreviewTransitionPending, startPreviewTransition] = useTransition()
  const { previewOpen, setPreviewOpen } = useWorkflowPreviewVisibility()

  const handlePreviewToggle = useCallback(() => {
    startPreviewTransition(() => {
      setPreviewOpen((v) => !v)
    })
  }, [setPreviewOpen])

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-busy={isPreviewTransitionPending}
            aria-label={tWorkspace('previewToggleAriaLabel')}
            aria-pressed={previewOpen}
            className="shrink-0"
            onClick={handlePreviewToggle}
            size="icon"
            type="button"
            variant="outline"
          >
            <PanelRight aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-balance" side="bottom">
          <p>{tWorkspace('previewToggleTooltip')}</p>
          <p className="mt-1 text-muted-foreground">{tWorkspace('previewToggleShortcut')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export type WorkflowChatPanelProps = {
  workflowId: string
  initialMilestones: TimelineMilestone[]
  locationId: number
  analyticsRunId: number | null
}

export function WorkflowChatPanel({
  workflowId,
  initialMilestones,
  locationId,
  analyticsRunId,
}: WorkflowChatPanelProps) {
  const t = useTranslations('analytics.workflows.chat')
  const tSlash = useTranslations('analytics.workflows.chat.slashCommands')
  const tMention = useTranslations('analytics.workflows.chat.mentionMenu')
  const [text, setText] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [, startPreviewTransition] = useTransition()

  const { previewOpen, setPreviewOpen } = useWorkflowPreviewVisibility()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const previewPanelRef = usePanelRef()

  const [milestoneUi, dispatch] = useReducer(
    workflowMilestoneReducer,
    initialMilestones,
    createInitialWorkflowMilestoneUiState,
  )

  useEffect(() => {
    dispatch({ type: 'RESET', milestones: initialMilestones })
  }, [workflowId, initialMilestones])

  const ops = useMilestoneOperations(dispatch, { workflowId, locationId, t })

  const [selectedMilestoneId, setSelectedMilestoneId] = useQueryState('milestone', parseAsString)
  const searchParams = useSearchParams()

  const milestonesRef = useRef(milestoneUi.milestones)
  const selectedIdRef = useRef(selectedMilestoneId)
  milestonesRef.current = milestoneUi.milestones
  selectedIdRef.current = selectedMilestoneId

  useEffect(() => {
    const milestones = milestoneUi.milestones
    if (milestones.length === 0) {
      void setSelectedMilestoneId(null)
      return
    }
    if (selectedMilestoneId !== null && milestones.some((m) => m.id === selectedMilestoneId)) {
      return
    }
    const frame = requestAnimationFrame(() => {
      const m = milestonesRef.current
      const s = selectedIdRef.current
      if (m.length === 0) {
        return
      }
      if (s !== null && m.some((x) => x.id === s)) {
        return
      }
      const fromUrl = searchParams.get('milestone')
      if (fromUrl !== null && fromUrl !== '' && m.some((x) => x.id === fromUrl)) {
        return
      }
      void setSelectedMilestoneId(m[0]?.id ?? null)
    })
    return () => cancelAnimationFrame(frame)
  }, [milestoneUi.milestones, searchParams, selectedMilestoneId, setSelectedMilestoneId])

  const handleSelectMilestone = useCallback(
    (id: string | null) => {
      void setSelectedMilestoneId(id)
    },
    [setSelectedMilestoneId],
  )

  const handleRunMilestone = useCallback(
    async (milestoneId: string, chatModel?: ChatGatewayModelId) => {
      void setSelectedMilestoneId(milestoneId)
      await ops.handleRunMilestone(milestoneId, chatModel)
    },
    [ops, setSelectedMilestoneId],
  )

  const timelineOps = useMemo(() => ({ ...ops, handleRunMilestone }), [ops, handleRunMilestone])

  /** `useChat` keeps the first `transport` instance; a ref keeps milestone/workflow ids fresh per request. */
  const chatApiContextRef = useRef({
    workflowId,
    locationId,
    milestoneId: selectedMilestoneId,
  })
  /** After "clear chat", non-null so agents use a fresh LangGraph thread for this workflow. */
  const workflowChatSessionIdRef = useRef<string | null>(null)
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const selectedChatModelRef = useRef<ChatGatewayModelId>(DEFAULT_CHAT_GATEWAY_MODEL)
  selectedChatModelRef.current = selectedChatModel
  /** Pending @-mention: next `/api/chat` body includes presetReferenceMilestoneId until submit clears it. */
  const presetReferenceMilestoneIdRef = useRef<string | null>(null)
  chatApiContextRef.current = {
    workflowId,
    locationId,
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
          const presetRef = presetReferenceMilestoneIdRef.current
          presetReferenceMilestoneIdRef.current = null
          const sessionId = workflowChatSessionIdRef.current
          return {
            body: {
              ...mergedBody,
              messages: lastUser ? [lastUser] : messages,
              workflowId: ctx.workflowId,
              locationId: String(ctx.locationId),
              ...(ctx.milestoneId !== null ? { milestoneId: ctx.milestoneId } : {}),
              ...(presetRef !== null ? { presetReferenceMilestoneId: presetRef } : {}),
              ...(sessionId !== null ? { workflowChatSessionId: sessionId } : {}),
              model: selectedChatModelRef.current,
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
    })

  const slashCommands = useMemo(
    () => [
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

  const handleHydrateMilestoneData = ops.handleHydrateMilestoneData

  useEffect(() => {
    if (selectedMilestoneId === null) {
      return
    }
    void handleHydrateMilestoneData(selectedMilestoneId)
  }, [selectedMilestoneId, workflowId, handleHydrateMilestoneData])

  const chatWasBusy = useRef(false)
  useEffect(() => {
    const busy = status === 'streaming' || status === 'submitted'
    if (chatWasBusy.current && !busy && error == null && selectedMilestoneId !== null) {
      void handleHydrateMilestoneData(selectedMilestoneId)
    }
    chatWasBusy.current = busy
  }, [status, error, selectedMilestoneId, handleHydrateMilestoneData])

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    setText(next)
    if (!next.trimStart().startsWith('@')) {
      presetReferenceMilestoneIdRef.current = null
    }
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
      await sendMessage({
        text: content,
        ...(message.files?.length ? { files: message.files } : {}),
      })
    },
    [sendMessage],
  )

  const handleSelectSlashCommand = useCallback(
    async (command: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      setText('')
      await sendMessage({ text: command })
    },
    [sendMessage, status],
  )

  const handleSelectMention = useCallback(
    (milestoneId: string) => {
      if (status === 'streaming' || status === 'submitted') {
        return
      }
      const rawTitle = milestoneUi.milestones.find((m) => m.id === milestoneId)?.title?.trim() ?? ''
      const label = rawTitle.length > 0 ? rawTitle.replace(/\s+/g, ' ') : milestoneId
      const atMessage = label.startsWith('@') ? label : `@${label}`
      presetReferenceMilestoneIdRef.current = milestoneId
      setText(`${atMessage} `)
    },
    [milestoneUi.milestones, status],
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
    presetReferenceMilestoneIdRef.current = null
    const sid = crypto.randomUUID()
    workflowChatSessionIdRef.current = sid
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(workflowChatSessionStorageKey(workflowId), sid)
    }
  }, [workflowId, stop, clearError, setMessages])

  const isChatBusy = status === 'streaming' || status === 'submitted'
  const isSubmitDisabled = !text.trim() && !isChatBusy

  const timelineSlices = useWorkflowTimelineProviderSlices(
    milestoneUi,
    workflowId,
    locationId,
    analyticsRunId,
    isChatBusy,
    selectedMilestoneId,
    handleSelectMilestone,
    timelineOps,
  )

  const visibleMessages = useMemo(() => messages.filter((msg) => msg.role !== 'system'), [messages])

  useLayoutEffect(() => {
    const panel = previewPanelRef.current
    if (!panel || !isDesktop) {
      return
    }
    if (previewOpen) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }, [previewOpen, isDesktop, previewPanelRef])

  useEffect(() => {
    if (!isDesktop) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== '\\') {
        return
      }
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      startPreviewTransition(() => {
        setPreviewOpen((v) => !v)
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, setPreviewOpen])

  const chatPane = (
    <>
      <Conversation aria-live="polite">
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
                        <WorkflowChatMessageParts message={msg} role={msg.role} />
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
      <div className="shrink-0 p-4">
        <PromptInput globalDrop multiple onSubmit={handleSubmit}>
          <WorkflowChatComposerMenus
            commands={slashCommands}
            mentionAriaLabel={tMention('ariaLabel')}
            mentionEmptyLabel={tMention('empty')}
            onSelectMention={handleSelectMention}
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
            <PromptInputSubmit
              aria-label={isChatBusy ? t('stopChatAriaLabel') : t('submitChatAriaLabel')}
              disabled={isSubmitDisabled}
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )

  return (
    <TimelineProvider
      actions={timelineSlices.actions}
      chat={timelineSlices.chat}
      workspace={timelineSlices.workspace}
    >
      <WorkflowChatMentionProvider>
        <WorkflowChatLayout
          chatPane={chatPane}
          hasChatMessages={messages.length > 0}
          isChatBusy={isChatBusy}
          isDesktop={isDesktop}
          mobileChatOpen={mobileChatOpen}
          onMobileChatOpenChange={setMobileChatOpen}
          previewPane={<WorkflowPreviewPanelBodyLazy />}
          previewPanelRef={previewPanelRef}
          timelinePane={
            <TimelineWorkspace
              timelineTrailing={isDesktop ? <WorkflowPreviewToggleButton /> : null}
            />
          }
        />
      </WorkflowChatMentionProvider>
    </TimelineProvider>
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
