import type {
  PromotionCandidateMenuItem,
  MilestonePresetId,
  MenuTaggerMilestoneData,
  PostLineupMilestoneData,
  ReelLineupMilestoneData,
  StoryLineupMilestoneData,
  SchedulerMilestoneData,
} from '@/lib/graphql/node-schemas'
import type { ReactNode } from 'react'

export type { MilestonePresetId }

export type TimelineMilestoneStatus = 'complete' | 'failed' | 'pending' | 'empty'

export type PassCriteriaStatus = 'pass' | 'fail' | 'open'

export type PassCriteriaRow = {
  id: string
  requirement: string
  status: PassCriteriaStatus
}

export type MilestoneInput = {
  type: string
  value?: unknown
}

export type CampaignWindowPublicHoliday = {
  name: string
  description: string
  date: string
}

export type DatesMilestoneData = {
  startDate: string
  endDate: string
  publicHolidays: CampaignWindowPublicHoliday[]
}

export type CampaignBriefVenueSnapshot = {
  venueName: string
  city: string
  country: string
  currency: string
}

export type CampaignBriefMilestoneData = {
  venueSnapshot: CampaignBriefVenueSnapshot
  contentPillars: string[]
  audienceHypotheses: string[]
  proofOrientedAngles: string[]
  toneGuardrails: string[]
  campaignObjective: string
  mainCategory: string
  targetSegments: string[]
  messageHierarchy: string[]
  offerAndCtaPlan: string[]
  contentPillarPlan: string[]
  measurementPlan: string[]
  testingPlan: string[]
  riskGuardrails: string[]
}

export type PromotionCandidatesCategoryBlock = {
  category: string
  starItems: PromotionCandidateMenuItem[]
  puzzleItems: PromotionCandidateMenuItem[]
}

export type PromotionCandidatesMilestoneData = {
  mainCategory: string
  categories: PromotionCandidatesCategoryBlock[]
  sourceAnalyticsRunId?: string | null
  notes?: string
}

export type CultureHookIntersection = {
  topic: string
  conceptLink: string
  audienceRelevance: string
  contentExample: string
}

export type CultureHooksMilestoneData = {
  locationConcept: string
  targetAudience: string
  intersections: CultureHookIntersection[]
  guardrailCheck: string
}

export type IgProfileUsernameSuggestion = {
  username: string
  rationale: string
}

export type IgProfileBio = {
  text: string
  hook: string
  valueProp: string
  cta: string
  tone: string
}

export type IgProfileMilestoneData = {
  usernames: IgProfileUsernameSuggestion[]
  bios: IgProfileBio[]
}

export type {
  MenuTaggerMilestoneData,
  PostLineupMilestoneData,
  ReelLineupMilestoneData,
  StoryLineupMilestoneData,
}

export type MilestoneDataValue =
  | DatesMilestoneData
  | CampaignBriefMilestoneData
  | PromotionCandidatesMilestoneData
  | MenuTaggerMilestoneData
  | ReelLineupMilestoneData
  | PostLineupMilestoneData
  | StoryLineupMilestoneData
  | CultureHooksMilestoneData
  | IgProfileMilestoneData
  | SchedulerMilestoneData

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
  /** Placed after milestone controls in the toolbar when the timeline has milestones. */
  timelineTrailing?: ReactNode
}
