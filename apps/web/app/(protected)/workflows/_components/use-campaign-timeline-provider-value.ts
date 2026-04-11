'use client'

import { useMemo } from 'react'

import type { CampaignMilestoneUiState } from './campaign-milestone-reducer'
import { splitMilestoneUiState, type TimelineContextValue } from './timeline-context'
import type { MilestoneDataTask, PassCriteriaRow } from './timeline/types'

export type CampaignTimelineOpsHandles = {
  handleCreateMilestone: () => void | Promise<void>
  handleDeleteMilestone: (id: string) => void | Promise<void>
  handleRenameMilestone: (id: string, name: string) => Promise<boolean>
  handleMoveMilestone: (id: string, direction: 'up' | 'down') => void | Promise<void>
  handleUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  handleUpdateMilestoneGoal: (id: string, goal: string) => Promise<boolean>
  handleUpdateMilestoneData: (id: string, milestoneData: string) => Promise<boolean>
  handleHydrateMilestoneData: (id: string) => Promise<void>
  handleSetMilestoneDataTask: (id: string, dataTask: MilestoneDataTask) => Promise<boolean>
  handlePrepareMilestone: (id: string, dataTask: MilestoneDataTask) => void | Promise<void>
  handleRunMilestone: (id: string) => void | Promise<void>
  handleExportWorkflow: () => void | Promise<void>
}

export function useCampaignTimelineProviderValue(
  milestoneUi: CampaignMilestoneUiState,
  workflowId: string,
  isChatBusy: boolean,
  selectedMilestoneId: string | null,
  onSelectMilestone: (id: string | null) => void,
  ops: CampaignTimelineOpsHandles,
): TimelineContextValue {
  return useMemo(() => {
    const { milestoneState, errors } = splitMilestoneUiState(milestoneUi)
    return {
      workflowId,
      selectedMilestoneId,
      onSelectMilestone,
      milestoneState,
      errors,
      chat: { isBusy: isChatBusy },
      actions: {
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
      },
    }
  }, [milestoneUi, workflowId, isChatBusy, selectedMilestoneId, onSelectMilestone, ops])
}
