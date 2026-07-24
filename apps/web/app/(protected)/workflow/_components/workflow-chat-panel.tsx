'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { parseAsString, useQueryState } from 'nuqs'

import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import {
  InstagramItemsRefreshProvider,
  useInstagramItemsRefresh,
} from './instagram-items/instagram-items-refresh-context'
import { TimelineProvider } from './timeline-context'
import type { MilestoneInput } from './timeline/types'
import type { TimelineMilestone } from './timeline-workspace'
import { useMilestoneOperations } from './use-milestone-operations'
import { useWorkflowTimelineProviderSlices } from './use-workflow-timeline-provider-value'
import { WorkflowChatHost } from './workflow-chat-host'
import { WorkflowChatLayout } from './workflow-chat-layout'
import { WorkflowChatMentionProvider } from './workflow-chat-mention-context'
import { WorkflowChatPane } from './workflow-chat-pane'
import {
  createInitialWorkflowMilestoneUiState,
  workflowMilestoneReducer,
} from './workflow-milestone-reducer'
import { WorkflowVisualizationsProvider } from './workflow-visualizations-context'

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
  const [chatBusy, setChatBusy] = useState(false)
  const { refresh: onRefreshInstagramItems } = useInstagramItemsRefresh()

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
        onRefreshInstagramItems={onRefreshInstagramItems}
        selectedMilestoneId={selectedMilestoneId}
        workflowId={workflowId}
      >
        <WorkflowVisualizationsProvider workflowId={workflowId}>
          <WorkflowChatMentionProvider milestoneTitles={milestoneTitles}>
            <WorkflowChatLayout
              chatPane={
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  <WorkflowChatPane />
                </div>
              }
            />
          </WorkflowChatMentionProvider>
        </WorkflowVisualizationsProvider>
      </WorkflowChatHost>
    </TimelineProvider>
  )
}
