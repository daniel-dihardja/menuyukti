'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { WorkflowMilestoneUiState } from './workflow-milestone-reducer'
import type { MilestonePresetId } from '@/lib/milestones/preset-definitions'

import type { MilestoneDataValue, MilestoneInput, PassCriteriaRow } from './timeline/types'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

/** Milestone list + in-flight ids (no error strings). */
export type TimelineMilestoneState = Pick<
  WorkflowMilestoneUiState,
  | 'milestones'
  | 'creating'
  | 'deletingMilestoneId'
  | 'savingPassCriteriaMilestoneId'
  | 'savingGoalMilestoneId'
  | 'savingDataMilestoneId'
  | 'savingMilestoneSettingsMilestoneId'
  | 'runningMilestoneId'
  | 'runningStep'
>

export type TimelineErrors = Pick<
  WorkflowMilestoneUiState,
  | 'createError'
  | 'deleteError'
  | 'passCriteriaError'
  | 'goalError'
  | 'milestoneDataError'
  | 'milestoneRunError'
  | 'milestoneRunCriteriaHint'
  | 'milestoneSettingsError'
>

export type TimelineActions = {
  onCreateMilestone: () => boolean | Promise<boolean>
  onCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
  onDeleteMilestone: (id: string) => void | Promise<void>
  onUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  onUpdateMilestoneGoal: (id: string, goal: string) => Promise<boolean>
  onUpdateMilestoneData: (id: string, milestoneData: MilestoneDataValue) => Promise<boolean>
  onUpdateMilestoneInput: (id: string, milestoneInput: MilestoneInput) => Promise<boolean>
  onHydrateMilestoneData: (id: string) => Promise<void>
  onRunMilestone: (id: string, chatModel?: ChatGatewayModelId) => void | Promise<void>
}

/** Workflow + milestone list state + errors (excludes chat streaming and action refs). */
export type TimelineWorkspaceStateValue = {
  workflowId: string
  locationId: number
  analyticsRunId: number | null
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

export function splitMilestoneUiState(ui: WorkflowMilestoneUiState): {
  milestoneState: TimelineMilestoneState
  errors: TimelineErrors
} {
  const {
    createError,
    deleteError,
    passCriteriaError,
    goalError,
    milestoneDataError,
    milestoneRunError,
    milestoneRunCriteriaHint,
    milestoneSettingsError,
    ...milestoneState
  } = ui
  return {
    milestoneState,
    errors: {
      createError,
      deleteError,
      passCriteriaError,
      goalError,
      milestoneDataError,
      milestoneRunError,
      milestoneRunCriteriaHint,
      milestoneSettingsError,
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
