import type { ReactNode } from 'react'

export type TimelineMilestoneStatus = 'complete' | 'failed' | 'pending' | 'empty'

export type PassCriteriaStatus = 'pass' | 'fail' | 'open'

export type PassCriteriaRow = {
  id?: string
  requirement: string
  status: PassCriteriaStatus
}

/** Milestone agent run skill selection; stored on milestone `data` JSON. */
export type MilestoneRunSkillMode = 'auto' | 'fixed'

export type MilestonePresetId = 'dates' | 'restaurant_brand_brief' | 'promotion_candidates'

export type DatesMilestoneInput = {
  startDate: string
  endDate: string
}

export type DatesMilestoneInputEnvelope = {
  type: 'dates'
  value: DatesMilestoneInput
}

export type MilestoneInput = {
  type: string
  value?: unknown
}

export type DatesPublicHoliday = {
  name: string
  description: string
  date: string
}

export type DatesMilestoneData = {
  startDate: string
  endDate: string
  publicHolidays: DatesPublicHoliday[]
}

export type BrandBriefVenueSnapshot = {
  venueName: string
  city: string
  country: string
  currency: string
}

export type BrandBriefMilestoneData = {
  venueSnapshot: BrandBriefVenueSnapshot
  contentPillars: string[]
  audienceHypotheses: string[]
  proofOrientedAngles: string[]
  toneGuardrails: string[]
}

export type PromotionCandidatesCategoryBlock = {
  menuCategory: string
  starHighlights: string[]
  puzzleHighlights: string[]
  notes?: string
}

export type PromotionCandidatesMilestoneData = {
  grouping: 'by_menu_category' | 'flat'
  categories: Record<string, PromotionCandidatesCategoryBlock>
  flatSummary: string
  promotionIdeas: string[]
}

export type MilestoneDataValue =
  | DatesMilestoneData
  | BrandBriefMilestoneData
  | PromotionCandidatesMilestoneData

export type TimelineMilestone = {
  id: string
  title: string
  passCriteria: PassCriteriaRow[]
  /** Free-form goal text for the Goal tab (stored on the goal child node). */
  goal?: string
  /** Milestone data (structured JSON); stored on the child `milestonedata` node as flat preset JSON. */
  data?: MilestoneDataValue
  /** Preset marker for milestone-specific UI behavior. */
  presetId?: MilestonePresetId
  /** Typed per-milestone input (e.g. Dates fields); stored on milestone `data` JSON. */
  milestoneInput?: MilestoneInput
  /** Auto: LLM picks skills. Fixed: use `milestoneRunSkillIds` (max 2). */
  milestoneRunSkillMode?: MilestoneRunSkillMode
  /** Registry skill ids when mode is `fixed`. */
  milestoneRunSkillIds?: string[]
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
