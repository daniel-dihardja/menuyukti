'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { CampaignMilestoneUiState } from './campaign-milestone-reducer'
import type { MilestoneDataTask, PassCriteriaRow } from './timeline/types'

/** Milestone list + in-flight ids (no error strings). */
export type TimelineMilestoneState = Pick<
  CampaignMilestoneUiState,
  | 'milestones'
  | 'creating'
  | 'deletingMilestoneId'
  | 'renamingMilestoneId'
  | 'savingPassCriteriaMilestoneId'
  | 'savingGoalMilestoneId'
  | 'savingDataMilestoneId'
  | 'movingMilestoneId'
  | 'runningMilestoneId'
  | 'runningStep'
  | 'preparingMilestoneId'
  | 'exporting'
>

export type TimelineErrors = Pick<
  CampaignMilestoneUiState,
  | 'createError'
  | 'deleteError'
  | 'renameError'
  | 'moveError'
  | 'passCriteriaError'
  | 'goalError'
  | 'milestoneDataError'
  | 'milestonePrepareError'
  | 'milestoneRunError'
  | 'exportError'
>

export type TimelineActions = {
  onCreateMilestone: () => void | Promise<void>
  onDeleteMilestone: (id: string) => void | Promise<void>
  onRenameMilestone: (id: string, name: string) => Promise<boolean>
  onMoveMilestone: (id: string, direction: 'up' | 'down') => void | Promise<void>
  onUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  onUpdateMilestoneGoal: (id: string, goal: string) => Promise<boolean>
  onUpdateMilestoneData: (id: string, milestoneData: string) => Promise<boolean>
  onHydrateMilestoneData: (id: string) => Promise<void>
  onSetMilestoneDataTask: (id: string, dataTask: MilestoneDataTask) => Promise<boolean>
  onPrepareMilestone: (id: string, dataTask: MilestoneDataTask) => void | Promise<void>
  onRunMilestone: (id: string) => void | Promise<void>
  onExport: () => void | Promise<void>
}

export type TimelineContextValue = {
  workflowId: string
  selectedMilestoneId: string | null
  onSelectMilestone: (id: string | null) => void | Promise<void>
  milestoneState: TimelineMilestoneState
  errors: TimelineErrors
  actions: TimelineActions
  chat: { isBusy: boolean }
}

const TimelineContext = createContext<TimelineContextValue | null>(null)

export function splitMilestoneUiState(ui: CampaignMilestoneUiState): {
  milestoneState: TimelineMilestoneState
  errors: TimelineErrors
} {
  const {
    createError,
    deleteError,
    renameError,
    moveError,
    passCriteriaError,
    goalError,
    milestoneDataError,
    milestonePrepareError,
    milestoneRunError,
    exportError,
    ...milestoneState
  } = ui
  return {
    milestoneState,
    errors: {
      createError,
      deleteError,
      renameError,
      moveError,
      passCriteriaError,
      goalError,
      milestoneDataError,
      milestonePrepareError,
      milestoneRunError,
      exportError,
    },
  }
}

export function TimelineProvider({
  children,
  value,
}: {
  children: ReactNode
  value: TimelineContextValue
}) {
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}

export function useTimelineContext(): TimelineContextValue {
  const ctx = useContext(TimelineContext)
  if (!ctx) {
    throw new Error('useTimelineContext must be used within TimelineProvider')
  }
  return ctx
}
