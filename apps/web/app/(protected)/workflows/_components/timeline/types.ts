import type { ReactNode } from 'react'

export type TimelineMilestoneStatus = 'complete' | 'failed' | 'pending' | 'empty'

export type PassCriteriaStatus = 'pass' | 'fail' | 'open'

export type PassCriteriaRow = {
  id?: string
  requirement: string
  status: PassCriteriaStatus
}

/** Stored on milestone `data.dataTask` when the Data tab is manual entry only. */
export type MilestoneDataTask = 'manual'

export type TimelineMilestone = {
  id: string
  title: string
  passCriteria: PassCriteriaRow[]
  /** Free-form goal text for the Goal tab (stored on the goal child node). */
  goal?: string
  /** Data tab text; stored on a child `milestonedata` node as `{ data: string }`. */
  data?: string
  /** How Data tab content is produced; stored on milestone `data` JSON. */
  dataTask?: MilestoneDataTask
  /** Markdown body for the Result tab. */
  resultMarkdown?: string
  /** Derived rail status from pass criteria + optional run outcome. */
  status?: TimelineMilestoneStatus
}

export type TimelineWorkspaceProps = {
  isLoading?: boolean
  loadError?: string | null
  /** Placed after the create milestone control in the toolbar and beside create in the empty state. */
  timelineTrailing?: ReactNode
}

export type TimelineBodyProps = {
  selectedId: string | null
  onSelectMilestone: (id: string) => void
}
