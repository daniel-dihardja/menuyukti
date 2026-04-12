'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { CampaignMilestoneUiState } from './campaign-milestone-reducer'
import type { MilestonePresetId } from '@/lib/milestones/preset-definitions'

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
  onCreateMilestone: () => boolean | Promise<boolean>
  onCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
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

/** Workflow + milestone list state + errors (excludes chat streaming and action refs). */
export type TimelineWorkspaceStateValue = {
  workflowId: string
  selectedMilestoneId: string | null
  onSelectMilestone: (id: string | null) => void | Promise<void>
  milestoneState: TimelineMilestoneState
  errors: TimelineErrors
}

export type TimelineChatState = { isBusy: boolean }

/** Full snapshot (e.g. tests); prefer granular hooks to avoid unnecessary re-renders. */
export type TimelineContextValue = TimelineWorkspaceStateValue & {
  actions: TimelineActions
  chat: TimelineChatState
}

const TimelineActionsContext = createContext<TimelineActions | null>(null)
const TimelineChatContext = createContext<TimelineChatState | null>(null)
const TimelineWorkspaceStateContext = createContext<TimelineWorkspaceStateValue | null>(null)

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
  actions,
  chat,
  workspace,
}: {
  children: ReactNode
  actions: TimelineActions
  chat: TimelineChatState
  workspace: TimelineWorkspaceStateValue
}) {
  return (
    <TimelineActionsContext.Provider value={actions}>
      <TimelineChatContext.Provider value={chat}>
        <TimelineWorkspaceStateContext.Provider value={workspace}>
          {children}
        </TimelineWorkspaceStateContext.Provider>
      </TimelineChatContext.Provider>
    </TimelineActionsContext.Provider>
  )
}

export function useTimelineActions(): TimelineActions {
  const ctx = useContext(TimelineActionsContext)
  if (!ctx) {
    throw new Error('useTimelineActions must be used within TimelineProvider')
  }
  return ctx
}

export function useTimelineChat(): TimelineChatState {
  const ctx = useContext(TimelineChatContext)
  if (!ctx) {
    throw new Error('useTimelineChat must be used within TimelineProvider')
  }
  return ctx
}

export function useTimelineWorkspaceState(): TimelineWorkspaceStateValue {
  const ctx = useContext(TimelineWorkspaceStateContext)
  if (!ctx) {
    throw new Error('useTimelineWorkspaceState must be used within TimelineProvider')
  }
  return ctx
}
