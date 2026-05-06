'use client'

import { useMemo } from 'react'

import type { CampaignMilestoneUiState } from './campaign-milestone-reducer'
import {
  splitMilestoneUiState,
  type TimelineActions,
  type TimelineChatState,
  type TimelineWorkspaceStateValue,
} from './timeline-context'
import type { MilestonePresetId } from '@/lib/milestones/preset-definitions'

import type {
  MilestoneDataValue,
  MilestoneInput,
  MilestoneRunSkillMode,
  PassCriteriaRow,
} from './timeline/types'

export type CampaignTimelineOpsHandles = {
  handleCreateMilestone: () => boolean | Promise<boolean>
  handleCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
  handleDeleteMilestone: (id: string) => void | Promise<void>
  handleRenameMilestone: (id: string, name: string) => Promise<boolean>
  handleMoveMilestone: (id: string, direction: 'up' | 'down') => void | Promise<void>
  handleUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  handleUpdateMilestoneGoal: (id: string, goal: string) => Promise<boolean>
  handleUpdateMilestoneData: (id: string, milestoneData: MilestoneDataValue) => Promise<boolean>
  handleUpdateMilestoneInput: (id: string, milestoneInput: MilestoneInput) => Promise<boolean>
  handleUpdateMilestoneRunSettings: (
    id: string,
    settings: { milestoneRunSkillMode: MilestoneRunSkillMode; milestoneRunSkillIds: string[] },
  ) => Promise<boolean>
  handleHydrateMilestoneData: (id: string) => Promise<void>
  handleRunMilestone: (id: string) => void | Promise<void>
  handleExportWorkflow: () => void | Promise<void>
}

export type CampaignTimelineProviderSlices = {
  actions: TimelineActions
  chat: TimelineChatState
  workspace: TimelineWorkspaceStateValue
}

export function useCampaignTimelineProviderSlices(
  milestoneUi: CampaignMilestoneUiState,
  workflowId: string,
  isChatBusy: boolean,
  selectedMilestoneId: string | null,
  onSelectMilestone: (id: string | null) => void,
  ops: CampaignTimelineOpsHandles,
): CampaignTimelineProviderSlices {
  const { milestoneState, errors } = useMemo(
    () => splitMilestoneUiState(milestoneUi),
    [milestoneUi],
  )

  const actions = useMemo<TimelineActions>(
    () => ({
      onCreateMilestone: ops.handleCreateMilestone,
      onCreateMilestoneFromPreset: ops.handleCreateMilestoneFromPreset,
      onDeleteMilestone: ops.handleDeleteMilestone,
      onRenameMilestone: ops.handleRenameMilestone,
      onMoveMilestone: ops.handleMoveMilestone,
      onUpdatePassCriteria: ops.handleUpdatePassCriteria,
      onUpdateMilestoneGoal: ops.handleUpdateMilestoneGoal,
      onUpdateMilestoneData: ops.handleUpdateMilestoneData,
      onUpdateMilestoneInput: ops.handleUpdateMilestoneInput,
      onUpdateMilestoneRunSettings: ops.handleUpdateMilestoneRunSettings,
      onHydrateMilestoneData: ops.handleHydrateMilestoneData,
      onRunMilestone: ops.handleRunMilestone,
      onExport: ops.handleExportWorkflow,
    }),
    [ops],
  )

  const chat = useMemo<TimelineChatState>(() => ({ isBusy: isChatBusy }), [isChatBusy])

  const workspace = useMemo<TimelineWorkspaceStateValue>(
    () => ({
      workflowId,
      selectedMilestoneId,
      onSelectMilestone,
      milestoneState,
      errors,
    }),
    [workflowId, selectedMilestoneId, onSelectMilestone, milestoneState, errors],
  )

  return { actions, chat, workspace }
}
