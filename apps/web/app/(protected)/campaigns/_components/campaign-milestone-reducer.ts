import type { TimelineMilestone } from './timeline/types'

export type CampaignMilestoneUiState = {
  milestones: TimelineMilestone[]
  creating: boolean
  createError: string | null
  deletingMilestoneId: string | null
  deleteError: string | null
  renamingMilestoneId: string | null
  renameError: string | null
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
  milestoneRunError: string | null
  preparingMilestoneId: string | null
  milestonePrepareError: string | null
}

export function createInitialCampaignMilestoneUiState(
  milestones: TimelineMilestone[],
): CampaignMilestoneUiState {
  return {
    milestones,
    creating: false,
    createError: null,
    deletingMilestoneId: null,
    deleteError: null,
    renamingMilestoneId: null,
    renameError: null,
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
    milestoneRunError: null,
    preparingMilestoneId: null,
    milestonePrepareError: null,
  }
}

export type CampaignMilestoneAction =
  | { type: 'RESET'; milestones: TimelineMilestone[] }
  | {
      type: 'PATCH'
      patch: Partial<CampaignMilestoneUiState>
    }
  | {
      type: 'UPDATE_MILESTONES'
      updater: (prev: TimelineMilestone[]) => TimelineMilestone[]
    }

export function campaignMilestoneReducer(
  state: CampaignMilestoneUiState,
  action: CampaignMilestoneAction,
): CampaignMilestoneUiState {
  switch (action.type) {
    case 'RESET':
      return createInitialCampaignMilestoneUiState(action.milestones)
    case 'PATCH':
      return { ...state, ...action.patch }
    case 'UPDATE_MILESTONES':
      return { ...state, milestones: action.updater(state.milestones) }
    default:
      return state
  }
}
