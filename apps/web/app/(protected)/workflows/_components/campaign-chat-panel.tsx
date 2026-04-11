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
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { usePanelRef } from '@workspace/ui/components/resizable'
import { Skeleton } from '@workspace/ui/components/skeleton'
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
import { CampaignChatLayout } from './campaign-chat-layout'
import { ChatMessageParts } from './chat-message-parts'

import {
  campaignMilestoneReducer,
  createInitialCampaignMilestoneUiState,
} from './campaign-milestone-reducer'
import { TimelineProvider } from './timeline-context'
import { useCampaignPreviewVisibility } from './use-campaign-preview-visibility'
import { useCampaignTimelineProviderValue } from './use-campaign-timeline-provider-value'
import { useMilestoneOperations } from './use-milestone-operations'

/** Code-split preview; collapsible panel keeps the subtree mounted when hidden on desktop. */
const CampaignPreviewPanelBodyLazy = dynamic(
  () => import('./campaign-preview-panel-body').then((m) => m.CampaignPreviewPanelBody),
  {
    ssr: false,
    loading: () => <Skeleton className="h-28 w-full rounded-lg" />,
  },
)

function CampaignPreviewToggleButton() {
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const [isPreviewTransitionPending, startPreviewTransition] = useTransition()
  const { previewOpen, setPreviewOpen } = useCampaignPreviewVisibility()

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

export type CampaignChatPanelProps = {
  workflowId: string
  initialMilestones: TimelineMilestone[]
  locationId: number
}

export function CampaignChatPanel({
  workflowId,
  initialMilestones,
  locationId,
}: CampaignChatPanelProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const [text, setText] = useState('')
  const [, startPreviewTransition] = useTransition()

  const { previewOpen, setPreviewOpen } = useCampaignPreviewVisibility()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const previewPanelRef = usePanelRef()

  const [milestoneUi, dispatch] = useReducer(
    campaignMilestoneReducer,
    initialMilestones,
    createInitialCampaignMilestoneUiState,
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

  /** `useChat` keeps the first `transport` instance; a ref keeps milestone/workflow ids fresh per request. */
  const chatApiContextRef = useRef({
    workflowId,
    locationId,
    milestoneId: selectedMilestoneId,
  })
  chatApiContextRef.current = {
    workflowId,
    locationId,
    milestoneId: selectedMilestoneId,
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body: mergedBody }) => {
          const ctx = chatApiContextRef.current
          return {
            body: {
              ...mergedBody,
              messages,
              workflowId: ctx.workflowId,
              locationId: String(ctx.locationId),
              ...(ctx.milestoneId !== null ? { milestoneId: ctx.milestoneId } : {}),
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate } = useChat({
    transport,
  })

  const chatWasBusy = useRef(false)
  useEffect(() => {
    const busy = status === 'streaming' || status === 'submitted'
    if (chatWasBusy.current && !busy && error == null && selectedMilestoneId !== null) {
      void ops.handleHydrateMilestoneData(selectedMilestoneId)
    }
    chatWasBusy.current = busy
  }, [status, error, selectedMilestoneId, ops])

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
      await sendMessage({
        text: content,
        ...(message.files?.length ? { files: message.files } : {}),
      })
    },
    [sendMessage],
  )

  const handleRetry = useCallback(async () => {
    clearError()
    await regenerate()
  }, [clearError, regenerate])

  const isSubmitDisabled = !text.trim() || status === 'streaming' || status === 'submitted'
  const isChatBusy = status === 'streaming' || status === 'submitted'

  const timelineValue = useCampaignTimelineProviderValue(
    milestoneUi,
    workflowId,
    isChatBusy,
    selectedMilestoneId,
    handleSelectMilestone,
    ops,
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
  }, [setPreviewOpen])

  const handleMobileSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setPreviewOpen(false)
      }
    },
    [setPreviewOpen],
  )

  const chatPane = (
    <>
      <Conversation aria-live="polite">
        <ConversationContent>
          {error ? (
            <Alert aria-live="polite" className="items-start" variant="destructive">
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <p>{error.message}</p>
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
                        <ChatMessageParts message={msg} role={msg.role} />
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
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={t('placeholder')}
              value={text}
              onChange={handleTextChange}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit disabled={isSubmitDisabled} status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )

  return (
    <TimelineProvider value={timelineValue}>
      <CampaignChatLayout
        chatPane={chatPane}
        isDesktop={isDesktop}
        mobilePreviewTitle={tWorkspace('previewTitle')}
        onMobileSheetOpenChange={handleMobileSheetOpenChange}
        previewOpen={previewOpen}
        previewPane={<CampaignPreviewPanelBodyLazy />}
        previewPanelRef={previewPanelRef}
        timelinePane={<TimelineWorkspace timelineTrailing={<CampaignPreviewToggleButton />} />}
      />
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
