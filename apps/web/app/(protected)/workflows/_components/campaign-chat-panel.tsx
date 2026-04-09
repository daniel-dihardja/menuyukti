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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePanelRef,
} from '@workspace/ui/components/resizable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@workspace/ui/components/sheet'
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
  useState,
  useTransition,
} from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'
import type { TimelineMilestone } from './timeline-workspace'
import { TimelineWorkspace } from './timeline-workspace'
import { ChatMessageParts } from './chat-message-parts'

import {
  campaignMilestoneReducer,
  createInitialCampaignMilestoneUiState,
} from './campaign-milestone-reducer'
import { TimelineProvider, type TimelineContextValue } from './timeline-context'
import { useCampaignPreviewVisibility } from './use-campaign-preview-visibility'
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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { workflowId },
      }),
    [workflowId],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate } = useChat({
    transport,
  })

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

  const timelineValue = useMemo<TimelineContextValue>(
    () => ({
      ...milestoneUi,
      workflowId,
      isChatBusy,
      onCreateMilestone: ops.handleCreateMilestone,
      onDeleteMilestone: ops.handleDeleteMilestone,
      onRenameMilestone: ops.handleRenameMilestone,
      onMoveMilestone: ops.handleMoveMilestone,
      onUpdatePassCriteria: ops.handleUpdatePassCriteria,
      onUpdateMilestoneGoal: ops.handleUpdateMilestoneGoal,
      onUpdateMilestoneData: ops.handleUpdateMilestoneData,
      onHydrateMilestoneData: ops.handleHydrateMilestoneData,
      onSetMilestoneDataTask: ops.handleSetMilestoneDataTask,
      onPrepareMilestone: ops.handlePrepareMilestone,
      onRunMilestone: ops.handleRunMilestone,
      onExport: ops.handleExportWorkflow,
    }),
    [workflowId, milestoneUi, isChatBusy, ops],
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

  return (
    <TimelineProvider value={timelineValue}>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden">
            <ResizablePanel defaultSize={isDesktop ? 40 : 40} minSize={isDesktop ? 28 : 22}>
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <TimelineWorkspace timelineTrailing={<CampaignPreviewToggleButton />} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {isDesktop ? (
              <ResizablePanel
                className="bg-muted/20 p-3"
                collapsedSize={0}
                collapsible
                defaultSize={22}
                id="campaign-preview"
                minSize={16}
                panelRef={previewPanelRef}
              >
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  <CampaignPreviewPanelBodyLazy />
                </div>
              </ResizablePanel>
            ) : null}

            {isDesktop ? <ResizableHandle withHandle /> : null}

            <ResizablePanel defaultSize={isDesktop ? 38 : 60} minSize={isDesktop ? 22 : 28}>
              <div className="relative flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
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
                      <ConversationEmptyState
                        description={t('emptyDescription')}
                        title={t('emptyTitle')}
                      />
                    ) : (
                      <>
                        {visibleMessages.map((msg) => {
                          const isLast = msg === visibleMessages[visibleMessages.length - 1]
                          const isActiveStream =
                            isLast && (status === 'submitted' || status === 'streaming')
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
                      <PromptInputSubmit
                        disabled={isSubmitDisabled}
                        status={status}
                        onStop={stop}
                      />
                    </PromptInputFooter>
                  </PromptInput>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <Sheet onOpenChange={handleMobileSheetOpenChange} open={!isDesktop && previewOpen}>
        <SheetContent
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{tWorkspace('previewTitle')}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-3">
            <CampaignPreviewPanelBodyLazy />
          </div>
        </SheetContent>
      </Sheet>
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
