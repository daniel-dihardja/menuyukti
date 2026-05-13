import type {
  PromotionCandidateMenuItem,
  MilestonePresetId,
  MenuTaggerMilestoneData,
  ReelLineupMilestoneData,
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

export type PostSchedulerMonthlyArcWeek = {
  week: 1 | 2 | 3 | 4
  objective: string
  rationale: string
}

export type PostSchedulerMilestoneData = {
  monthlyArc: {
    weeks: PostSchedulerMonthlyArcWeek[]
  }
  contentRatio: {
    pillars: Array<{
      pillar: string
      percent: number
      reason: string
    }>
  }
  formatMix: {
    formats: Array<{
      format:
        | 'Reels'
        | 'Carousels'
        | 'Single posts'
        | 'Stories'
        | 'Highlights updates'
        | 'Lives'
        | 'Collaborator posts'
      count: number
      reason: string
    }>
  }
  weeklySlotPlan: Array<{
    week: 1 | 2 | 3 | 4
    day: string
    format: 'Reel' | 'Carousel' | 'Single post'
    pillar: string
    hook: string
    captionStructure: string
    ctaType: 'Reserve' | 'Order' | 'DM' | 'Walk in' | 'Save'
    funnelStage: 'Awareness' | 'Consideration' | 'Conversion' | 'Loyalty'
    visualDirection: string
    notes: string
  }>
  guardrailCheck: string
}

export type PostSchedulerPostItem = PostSchedulerMilestoneData['weeklySlotPlan'][number]

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

export type FormatMixMilestoneData = {
  formats: Array<{
    format: 'single_post' | 'carousel' | 'single_video_reel' | 'multi_video_reel'
    percent: number
  }>
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

export type { MenuTaggerMilestoneData, ReelLineupMilestoneData }

export type MilestoneDataValue =
  | DatesMilestoneData
  | CampaignBriefMilestoneData
  | PostSchedulerMilestoneData
  | PromotionCandidatesMilestoneData
  | MenuTaggerMilestoneData
  | ReelLineupMilestoneData
  | CultureHooksMilestoneData
  | FormatMixMilestoneData
  | IgProfileMilestoneData

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
