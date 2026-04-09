import type { ReactNode } from 'react'

export type TimelineMilestoneStatus = 'complete' | 'failed' | 'pending' | 'empty'

export type PassCriteriaStatus = 'pass' | 'fail' | 'open'

export type PassCriteriaRow = {
  id?: string
  requirement: string
  status: PassCriteriaStatus
}

export type MilestoneDataTask = 'manual' | 'location_profile'

export type TimelineMilestone = {
  id: string
  title: string
  passCriteria: PassCriteriaRow[]
  /** Free-form goal text for the Goal tab (stored on the milestone node). */
  goal?: string
  /** Data tab text; stored on a child `milestonedata` node as `{ data: string }`. */
  data?: string
  /** How Data tab content is produced; stored on milestone `data` JSON. */
  dataTask?: MilestoneDataTask
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

/** Optional loading/error when milestones are not yet in `TimelineProvider`. */
export type TimelineWorkspaceProps = {
  isLoading?: boolean
  loadError?: string | null
  /** Placed after the create milestone control in the toolbar and beside create in the empty state. */
  timelineTrailing?: ReactNode
}

export type TimelineBodyLabelsProps = {
  selectedId: string | null
  onSelectMilestone: (id: string) => void
  listLabel: string
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  deleteMilestoneConfirmTitle: string
  deleteMilestoneConfirmDescription: string
  deleteMilestoneConfirmCancel: string
  deleteMilestoneConfirmAction: string
}
