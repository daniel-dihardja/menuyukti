export type TimelineMilestoneStatus = 'complete' | 'failed' | 'pending' | 'empty'

export type PassCriteriaStatus = 'pass' | 'fail' | 'open'

export type PassCriteriaRow = {
  id?: string
  requirement: string
  status: PassCriteriaStatus
}

export type TimelineMilestone = {
  id: string
  title: string
  passCriteria: PassCriteriaRow[]
  /** Free-form goal text for the Goal tab (stored on the milestone node). */
  goal?: string
  /** Data tab text; stored on a child `milestonedata` node as `{ data: string }`. */
  data?: string
  /** Markdown body for the Result tab. */
  resultMarkdown?: string
  /** Defaults to `empty` when omitted. */
  status?: TimelineMilestoneStatus
}

export type MilestoneStatusLabels = {
  complete: string
  failed: string
  pending: string
  empty: string
}

export type TimelineWorkspaceProps = {
  milestones: TimelineMilestone[]
  isLoading?: boolean
  loadError?: string | null
  createError?: string | null
  deleteError?: string | null
  moveError?: string | null
  creating?: boolean
  deletingMilestoneId?: string | null
  movingMilestoneId?: string | null
  onCreateMilestone: () => void | Promise<void>
  onDeleteMilestone?: (id: string) => void | Promise<void>
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  onMoveMilestone?: (id: string, direction: 'up' | 'down') => void | Promise<void>
  renamingMilestoneId?: string | null
  renameError?: string | null
  onUpdatePassCriteria?: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  savingPassCriteriaMilestoneId?: string | null
  passCriteriaError?: string | null
  onUpdateMilestoneGoal?: (id: string, goal: string) => Promise<boolean>
  savingGoalMilestoneId?: string | null
  goalError?: string | null
  onUpdateMilestoneData?: (id: string, milestoneData: string) => Promise<boolean>
  savingDataMilestoneId?: string | null
  milestoneDataError?: string | null
  onRunMilestone?: (id: string) => void | Promise<void>
  isChatBusy?: boolean
  runningMilestoneId?: string | null
  runningStep?: string | null
  milestoneRunError?: string | null
}
