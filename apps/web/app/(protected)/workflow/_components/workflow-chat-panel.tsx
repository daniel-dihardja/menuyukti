'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import { Button } from '@workspace/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
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
import { parseAsString, useQueryState } from 'nuqs'
import { PanelRight } from 'lucide-react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import {
  InstagramItemsRefreshProvider,
  useInstagramItemsRefresh,
} from './instagram-items/instagram-items-refresh-context'
import { TimelineProvider } from './timeline-context'
import type { MilestoneInput } from './timeline/types'
import type { TimelineMilestone } from './timeline-workspace'
import { useMilestoneOperations } from './use-milestone-operations'
import { useWorkflowPreviewVisibility } from './use-workflow-preview-visibility'
import { useWorkflowTimelineProviderSlices } from './use-workflow-timeline-provider-value'
import { WorkflowChatHost } from './workflow-chat-host'
import { WorkflowChatLayout } from './workflow-chat-layout'
import { WorkflowChatMentionProvider } from './workflow-chat-mention-context'
import { WorkflowChatPane } from './workflow-chat-pane'
import {
  createInitialWorkflowMilestoneUiState,
  workflowMilestoneReducer,
} from './workflow-milestone-reducer'
import { WorkflowVisualizationsPane } from './workflow-visualizations-pane'
import { WorkflowVisualizationsProvider } from './workflow-visualizations-context'
import { WorkflowPreviewPanelSkeleton } from './workflow-workspace-skeleton'

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
  return (
    <InstagramItemsRefreshProvider>
      <WorkflowChatPanelInner
        analyticsRunId={analyticsRunId}
        initialMilestones={initialMilestones}
        locationId={locationId}
        workflowId={workflowId}
      />
    </InstagramItemsRefreshProvider>
  )
}

function WorkflowChatPanelInner({
  workflowId,
  initialMilestones,
  locationId,
  analyticsRunId,
}: WorkflowChatPanelProps) {
  const t = useTranslations('analytics.workflows.chat')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [, startPreviewTransition] = useTransition()
  const { refresh: onRefreshInstagramItems } = useInstagramItemsRefresh()

  const { previewOpen, setPreviewOpen } = useWorkflowPreviewVisibility()
  const isDesktop = useDesktopLayout()
  const artifactPanelRef = usePanelRef()

  const [milestoneUi, dispatch] = useReducer(
    workflowMilestoneReducer,
    initialMilestones,
    createInitialWorkflowMilestoneUiState,
  )

  useEffect(() => {
    dispatch({ type: 'RESET', milestones: initialMilestones })
  }, [workflowId, initialMilestones])

  const ops = useMilestoneOperations(dispatch, {
    workflowId,
    locationId,
    t,
    getMilestoneSnapshot: (milestoneId) => milestoneUi.milestones.find((m) => m.id === milestoneId),
  })

  const [selectedMilestoneId, setSelectedMilestoneId] = useQueryState('milestone', parseAsString)

  useEffect(() => {
    const milestones = milestoneUi.milestones
    if (milestones.length === 0) {
      if (selectedMilestoneId !== null) {
        void setSelectedMilestoneId(null)
      }
      return
    }
    if (
      selectedMilestoneId !== null &&
      !milestones.some((milestone) => milestone.id === selectedMilestoneId)
    ) {
      void setSelectedMilestoneId(null)
    }
  }, [milestoneUi.milestones, selectedMilestoneId, setSelectedMilestoneId])

  const handleSelectMilestone = useCallback(
    (id: string | null) => {
      void setSelectedMilestoneId(id)
    },
    [setSelectedMilestoneId],
  )

  const handleRunMilestone = useCallback(
    async (
      milestoneId: string,
      chatModel?: ChatGatewayModelId,
      runOptions?: { milestoneInput?: MilestoneInput },
    ) => {
      void setSelectedMilestoneId(milestoneId)
      await ops.handleRunMilestone(milestoneId, chatModel, runOptions)
    },
    [ops, setSelectedMilestoneId],
  )

  const timelineOps = useMemo(() => ({ ...ops, handleRunMilestone }), [ops, handleRunMilestone])

  const handleHydrateMilestoneData = ops.handleHydrateMilestoneData

  useEffect(() => {
    if (selectedMilestoneId === null) {
      return
    }
    void handleHydrateMilestoneData(selectedMilestoneId)
  }, [selectedMilestoneId, workflowId, handleHydrateMilestoneData])

  const milestoneTitles = useMemo(
    () => milestoneUi.milestones.map((m) => ({ id: m.id, title: m.title })),
    [milestoneUi.milestones],
  )

  const onHydrateAfterChat = useCallback(
    (milestoneId: string) => {
      void handleHydrateMilestoneData(milestoneId)
    },
    [handleHydrateMilestoneData],
  )

  const onPrefetchMilestoneReference = useCallback(
    (milestoneId: string) => {
      void handleHydrateMilestoneData(milestoneId)
    },
    [handleHydrateMilestoneData],
  )

  const timelineSlices = useWorkflowTimelineProviderSlices(
    milestoneUi,
    workflowId,
    locationId,
    analyticsRunId,
    chatBusy,
    selectedMilestoneId,
    handleSelectMilestone,
    timelineOps,
  )

  useLayoutEffect(() => {
    const panel = artifactPanelRef.current
    if (!panel || !isDesktop) {
      return
    }
    if (previewOpen) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }, [previewOpen, isDesktop, artifactPanelRef])

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

  return (
    <TimelineProvider
      actions={timelineSlices.actions}
      chat={timelineSlices.chat}
      workspace={timelineSlices.workspace}
    >
      <WorkflowChatHost
        analyticsRunId={analyticsRunId}
        locationId={locationId}
        milestoneTitles={milestoneTitles}
        onBusyChange={setChatBusy}
        onHydrateAfterChat={onHydrateAfterChat}
        onPrefetchMilestoneReference={onPrefetchMilestoneReference}
        onRefreshInstagramItems={onRefreshInstagramItems}
        selectedMilestoneId={selectedMilestoneId}
        workflowId={workflowId}
      >
        <WorkflowVisualizationsProvider workflowId={workflowId}>
          <WorkflowChatMentionProvider milestoneTitles={milestoneTitles}>
            <WorkflowChatLayout
              artifactPane={<WorkflowPreviewPanelBodyLazy />}
              artifactPanelRef={artifactPanelRef}
              chatPane={
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  {isDesktop ? (
                    <div className="flex shrink-0 items-center justify-end border-b px-2 py-2">
                      <WorkflowPreviewToggleButton />
                    </div>
                  ) : null}
                  <div className="flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
                    <WorkflowChatPane />
                  </div>
                </div>
              }
              mobileChatOpen={mobileChatOpen}
              onMobileChatOpenChange={setMobileChatOpen}
              visualizationsPane={<WorkflowVisualizationsPane />}
            />
          </WorkflowChatMentionProvider>
        </WorkflowVisualizationsProvider>
      </WorkflowChatHost>
    </TimelineProvider>
  )
}
