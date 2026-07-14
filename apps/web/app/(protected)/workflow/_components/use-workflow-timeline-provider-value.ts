'use client'

import { useMemo } from 'react'

import type { WorkflowMilestoneUiState } from './workflow-milestone-reducer'
import {
  splitMilestoneUiState,
  type TimelineChatState,
  type TimelineWorkspaceStateValue,
} from './timeline-context'
import type { MilestonePresetId } from '@/lib/milestones/preset-definitions'
import { toTimelineActions } from './to-timeline-actions'

import type { MilestoneDataValue, MilestoneInput, PassCriteriaRow } from './timeline/types'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

export type WorkflowTimelineOpsHandles = {
  handleCreateMilestone: () => boolean | Promise<boolean>
  handleCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
  handleDeleteMilestone: (id: string) => void | Promise<void>
  handleMoveMilestone: (id: string, direction: 'up' | 'down') => void | Promise<void>
  handleUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  handleUpdateMilestoneData: (id: string, milestoneData: MilestoneDataValue) => Promise<boolean>
  handleUpdateMilestoneInput: (id: string, milestoneInput: MilestoneInput) => Promise<boolean>
  handleUpdateMilestoneRunChatModel: (
    id: string,
    runChatModel: ChatGatewayModelId,
  ) => Promise<boolean>
  handleHydrateMilestoneData: (id: string) => Promise<void>
  handleRunMilestone: (
    id: string,
    chatModel?: ChatGatewayModelId,
    options?: { milestoneInput?: MilestoneInput },
  ) => void | Promise<void>
  handleStopMilestoneRun: () => void
}

export type WorkflowTimelineProviderSlices = {
  actions: ReturnType<typeof toTimelineActions>
  chat: TimelineChatState
  workspace: TimelineWorkspaceStateValue
}

export function useWorkflowTimelineProviderSlices(
  milestoneUi: WorkflowMilestoneUiState,
  workflowId: string,
  locationId: number,
  analyticsRunId: number | null,
  isChatBusy: boolean,
  selectedMilestoneId: string | null,
  onSelectMilestone: (id: string | null) => void,
  ops: WorkflowTimelineOpsHandles,
): WorkflowTimelineProviderSlices {
  const { milestoneState, errors } = useMemo(
    () => splitMilestoneUiState(milestoneUi),
    [milestoneUi],
  )

  const actions = useMemo(() => toTimelineActions(ops), [ops])

  const chat = useMemo<TimelineChatState>(() => ({ isBusy: isChatBusy }), [isChatBusy])

  const workspace = useMemo<TimelineWorkspaceStateValue>(
    () => ({
      workflowId,
      locationId,
      analyticsRunId,
      selectedMilestoneId,
      onSelectMilestone,
      milestoneState,
      errors,
    }),
    [
      workflowId,
      locationId,
      analyticsRunId,
      selectedMilestoneId,
      onSelectMilestone,
      milestoneState,
      errors,
    ],
  )

  return { actions, chat, workspace }
}
