'use client'

import { createContext, use, type ReactNode } from 'react'

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
  | 'savingRunChatModelMilestoneId'
  | 'movingMilestoneId'
  | 'runningMilestoneId'
  | 'runningStep'
  | 'runningStepIteration'
  | 'runningReflectionRounds'
  | 'runningReflectionAddressing'
>

export type TimelineErrors = Pick<
  WorkflowMilestoneUiState,
  | 'createError'
  | 'deleteError'
  | 'moveError'
  | 'passCriteriaError'
  | 'goalError'
  | 'milestoneDataError'
  | 'milestoneRunError'
  | 'milestoneRunCriteriaHint'
  | 'milestoneSettingsError'
  | 'runChatModelError'
>

export type TimelineActions = {
  onCreateMilestone: () => boolean | Promise<boolean>
  onCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
  onDeleteMilestone: (id: string) => void | Promise<void>
  onMoveMilestone: (id: string, direction: 'up' | 'down') => void | Promise<void>
  onUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  onUpdateMilestoneGoal: (id: string, goal: string) => Promise<boolean>
  onUpdateMilestoneData: (id: string, milestoneData: MilestoneDataValue) => Promise<boolean>
  onUpdateMilestoneInput: (id: string, milestoneInput: MilestoneInput) => Promise<boolean>
  onUpdateMilestoneRunChatModel: (id: string, runChatModel: ChatGatewayModelId) => Promise<boolean>
  onHydrateMilestoneData: (id: string) => Promise<void>
  onRunMilestone: (
    id: string,
    chatModel?: ChatGatewayModelId,
    options?: { milestoneInput?: MilestoneInput },
  ) => void | Promise<void>
  onStopMilestoneRun: () => void
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
    moveError,
    passCriteriaError,
    goalError,
    milestoneDataError,
    milestoneRunError,
    milestoneRunCriteriaHint,
    milestoneSettingsError,
    runChatModelError,
    ...milestoneState
  } = ui
  return {
    milestoneState,
    errors: {
      createError,
      deleteError,
      moveError,
      passCriteriaError,
      goalError,
      milestoneDataError,
      milestoneRunError,
      milestoneRunCriteriaHint,
      milestoneSettingsError,
      runChatModelError,
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
    <TimelineActionsContext value={actions}>
      <TimelineChatContext value={chat}>
        <TimelineWorkspaceStateContext value={workspace}>{children}</TimelineWorkspaceStateContext>
      </TimelineChatContext>
    </TimelineActionsContext>
  )
}

export function useTimelineActions(): TimelineActions {
  const ctx = use(TimelineActionsContext)
  if (!ctx) {
    throw new Error('useTimelineActions must be used within TimelineProvider')
  }
  return ctx
}

export function useTimelineChat(): TimelineChatState {
  const ctx = use(TimelineChatContext)
  if (!ctx) {
    throw new Error('useTimelineChat must be used within TimelineProvider')
  }
  return ctx
}

export function useTimelineWorkspaceState(): TimelineWorkspaceStateValue {
  const ctx = use(TimelineWorkspaceStateContext)
  if (!ctx) {
    throw new Error('useTimelineWorkspaceState must be used within TimelineProvider')
  }
  return ctx
}
