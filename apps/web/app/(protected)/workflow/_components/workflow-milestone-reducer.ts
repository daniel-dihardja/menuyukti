import type { TimelineMilestone } from './timeline/types'
import type { CampaignBriefReflectionRound } from '@/lib/milestones/campaign-brief-reflection-run'

export type WorkflowMilestoneUiState = {
  milestones: TimelineMilestone[]
  creating: boolean
  createError: string | null
  deletingMilestoneId: string | null
  deleteError: string | null
  savingPassCriteriaMilestoneId: string | null
  passCriteriaError: string | null
  savingGoalMilestoneId: string | null
  goalError: string | null
  savingDataMilestoneId: string | null
  milestoneDataError: string | null
  moveError: string | null
  movingMilestoneId: string | null
  runningMilestoneId: string | null
  runningStep: string | null
  /** Reflect loop pass from SSE (critique / revise). */
  runningStepIteration: number | null
  /** Quality critique rounds streamed during campaign-brief reflection. */
  runningReflectionRounds: CampaignBriefReflectionRound[]
  /** Feedback items being addressed during reflect_revise. */
  runningReflectionAddressing: Array<{ criterionId: string; feedback: string }>
  milestoneRunError: string | null
  /** Shown after a run when fixed skills were used and some criteria failed (informational). */
  milestoneRunCriteriaHint: string | null
  savingMilestoneSettingsMilestoneId: string | null
  milestoneSettingsError: string | null
  savingRunChatModelMilestoneId: string | null
  runChatModelError: string | null
}

export function createInitialWorkflowMilestoneUiState(
  milestones: TimelineMilestone[],
): WorkflowMilestoneUiState {
  return {
    milestones,
    creating: false,
    createError: null,
    deletingMilestoneId: null,
    deleteError: null,
    savingPassCriteriaMilestoneId: null,
    passCriteriaError: null,
    savingGoalMilestoneId: null,
    goalError: null,
    savingDataMilestoneId: null,
    milestoneDataError: null,
    moveError: null,
    movingMilestoneId: null,
    runningMilestoneId: null,
    runningStep: null,
    runningStepIteration: null,
    runningReflectionRounds: [],
    runningReflectionAddressing: [],
    milestoneRunError: null,
    milestoneRunCriteriaHint: null,
    savingMilestoneSettingsMilestoneId: null,
    milestoneSettingsError: null,
    savingRunChatModelMilestoneId: null,
    runChatModelError: null,
  }
}

export type WorkflowMilestoneAction =
  | { type: 'RESET'; milestones: TimelineMilestone[] }
  | {
      type: 'PATCH'
      patch: Partial<WorkflowMilestoneUiState>
    }
  | {
      type: 'UPDATE_MILESTONES'
      updater: (prev: TimelineMilestone[]) => TimelineMilestone[]
    }

export function workflowMilestoneReducer(
  state: WorkflowMilestoneUiState,
  action: WorkflowMilestoneAction,
): WorkflowMilestoneUiState {
  switch (action.type) {
    case 'RESET':
      return createInitialWorkflowMilestoneUiState(action.milestones)
    case 'PATCH':
      return { ...state, ...action.patch }
    case 'UPDATE_MILESTONES':
      return { ...state, milestones: action.updater(state.milestones) }
    default:
      return state
  }
}
