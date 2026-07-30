'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
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

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { TimelineProvider } from './timeline-context'
import type { MilestoneInput } from './timeline/types'
import type { TimelineMilestone } from './timeline-workspace'
import { useMilestoneOperations } from './use-milestone-operations'
import { useWorkflowPreviewVisibility } from './use-workflow-preview-visibility'
import { useWorkflowTimelineProviderSlices } from './use-workflow-timeline-provider-value'
import { useWorkflowChatComposerState } from './workflow-chat-context'
import { WorkflowChatHost } from './workflow-chat-host'
import { WorkflowChatLayout } from './workflow-chat-layout'
import { WorkflowChatMentionProvider } from './workflow-chat-mention-context'
import {
  createInitialWorkflowMilestoneUiState,
  workflowMilestoneReducer,
} from './workflow-milestone-reducer'
import { WorkflowSidePanel } from './workflow-side-panel'
import { WorkflowVisualizationsProvider } from './workflow-visualizations-context'
import { WorkflowPreviewPanelSkeleton } from './workflow-workspace-skeleton'

const WorkflowPreviewPanelBodyLazy = dynamic(
  () => import('./workflow-preview-panel-body').then((m) => m.WorkflowPreviewPanelBody),
  {
    ssr: false,
    loading: () => <WorkflowPreviewPanelSkeleton className="h-full w-full" />,
  },
)

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
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
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
        selectedMilestoneId={selectedMilestoneId}
        workflowId={workflowId}
      >
        <WorkflowVisualizationsProvider workflowId={workflowId}>
          <WorkflowChatMentionProvider milestoneTitles={milestoneTitles}>
            <WorkflowChatPanelLayout
              isDesktop={isDesktop}
              mobileArtifactOpen={mobileArtifactOpen}
              onMobileArtifactOpenChange={setMobileArtifactOpen}
              previewOpen={previewOpen}
              previewPanelRef={previewPanelRef}
              setPreviewOpen={setPreviewOpen}
              startPreviewTransition={startPreviewTransition}
              storyArtifactHint={t('storyArtifact.ariaLabel')}
              storyArtifactTitle={t('storyArtifact.ariaLabel')}
            />
          </WorkflowChatMentionProvider>
        </WorkflowVisualizationsProvider>
      </WorkflowChatHost>
    </TimelineProvider>
  )
}

type WorkflowChatPanelLayoutProps = {
  isDesktop: boolean
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  previewOpen: boolean
  previewPanelRef: ReturnType<typeof usePanelRef>
  setPreviewOpen: ReturnType<typeof useWorkflowPreviewVisibility>['setPreviewOpen']
  startPreviewTransition: (cb: () => void) => void
  storyArtifactHint: string
  storyArtifactTitle: string
}

function WorkflowChatPanelLayout({
  isDesktop,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewOpen,
  previewPanelRef,
  setPreviewOpen,
  startPreviewTransition,
  storyArtifactHint,
  storyArtifactTitle,
}: WorkflowChatPanelLayoutProps) {
  const { chatMode } = useWorkflowChatComposerState()
  const showPreview = chatMode === 'story_image_assistant'

  useEffect(() => {
    if (showPreview) {
      setPreviewOpen(true)
      if (!isDesktop) {
        onMobileArtifactOpenChange(true)
      }
      return
    }
    onMobileArtifactOpenChange(false)
  }, [showPreview, isDesktop, setPreviewOpen, onMobileArtifactOpenChange])

  useLayoutEffect(() => {
    if (!showPreview || !isDesktop) {
      return
    }
    const panel = previewPanelRef.current
    if (!panel) {
      return
    }
    if (previewOpen) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }, [previewOpen, isDesktop, previewPanelRef, showPreview])

  useEffect(() => {
    if (!showPreview || !isDesktop) {
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
  }, [isDesktop, setPreviewOpen, showPreview, startPreviewTransition])

  return (
    <WorkflowChatLayout
      chatPane={<WorkflowSidePanel />}
      mobileArtifactHint={storyArtifactHint}
      mobileArtifactOpen={mobileArtifactOpen}
      mobileArtifactTitle={storyArtifactTitle}
      onMobileArtifactOpenChange={onMobileArtifactOpenChange}
      previewPane={<WorkflowPreviewPanelBodyLazy />}
      previewPanelRef={previewPanelRef}
      showPreview={showPreview}
    />
  )
}
