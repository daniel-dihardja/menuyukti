import type { ReactNode } from 'react'

export type TimelineMilestoneStatus = 'complete' | 'failed' | 'pending' | 'empty'

export type PassCriteriaStatus = 'pass' | 'fail' | 'open'

export type PassCriteriaRow = {
  id?: string
  requirement: string
  status: PassCriteriaStatus
}

export type MilestonePresetId =
  | 'restaurant_campaign_brief'
  | 'promotion_candidates'
  | 'post_scheduler'

export type MilestoneInput = {
  type: string
  value?: unknown
}

export type CampaignWindowPublicHoliday = {
  name: string
  description: string
  date: string
}

export type CampaignBriefVenueSnapshot = {
  venueName: string
  city: string
  country: string
  currency: string
}

export type CampaignBriefMilestoneData = {
  startDate: string
  endDate: string
  publicHolidays: CampaignWindowPublicHoliday[]
  venueSnapshot: CampaignBriefVenueSnapshot
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

export type PostSchedulerPostItem = {
  dayOfWeek: string
  date: string
  time: string
  postType: 'Reel' | 'Post'
  contentType: 'Carousel' | 'Single'
  promotedMenuItems: string[]
  captionIdea: string
}

export type PostSchedulerMilestoneData = {
  posts: PostSchedulerPostItem[]
}

export type MilestoneDataValue =
  | CampaignBriefMilestoneData
  | PromotionCandidatesMilestoneData
  | PostSchedulerMilestoneData

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
  /** Typed per-milestone input; stored on milestone `data` JSON. */
  milestoneInput?: MilestoneInput
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
