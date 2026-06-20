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
  useRef,
  useState,
  useTransition,
} from 'react'
import { useSearchParams } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import { PanelRight } from 'lucide-react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import type { TimelineMilestone } from './timeline-workspace'
import { TimelineWorkspace } from './timeline-workspace'
import { WorkflowChatLayout } from './workflow-chat-layout'
import { WorkflowChatMentionProvider } from './workflow-chat-mention-context'
import { WorkflowChatProvider } from './workflow-chat-context'
import { WorkflowChatPane } from './workflow-chat-pane'
import { useWorkflowChat } from './use-workflow-chat'

import {
  workflowMilestoneReducer,
  createInitialWorkflowMilestoneUiState,
} from './workflow-milestone-reducer'
import { TimelineProvider } from './timeline-context'
import { useWorkflowPreviewVisibility } from './use-workflow-preview-visibility'
import { useWorkflowTimelineProviderSlices } from './use-workflow-timeline-provider-value'
import { useMilestoneOperations } from './use-milestone-operations'
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
  const t = useTranslations('analytics.workflows.chat')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [, startPreviewTransition] = useTransition()

  const { previewOpen, setPreviewOpen } = useWorkflowPreviewVisibility()
  const isDesktop = useDesktopLayout()
  const previewPanelRef = usePanelRef()

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

  const workflowChat = useWorkflowChat({
    workflowId,
    locationId,
    selectedMilestoneId,
    milestoneTitles,
    onHydrateAfterChat,
  })

  const timelineSlices = useWorkflowTimelineProviderSlices(
    milestoneUi,
    workflowId,
    locationId,
    analyticsRunId,
    workflowChat.state.isChatBusy,
    selectedMilestoneId,
    handleSelectMilestone,
    timelineOps,
  )

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

  return (
    <TimelineProvider
      actions={timelineSlices.actions}
      chat={timelineSlices.chat}
      workspace={timelineSlices.workspace}
    >
      <WorkflowChatProvider actions={workflowChat.actions} state={workflowChat.state}>
        <WorkflowChatMentionProvider>
          <WorkflowChatLayout
            chatPane={<WorkflowChatPane />}
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
      </WorkflowChatProvider>
    </TimelineProvider>
  )
}
