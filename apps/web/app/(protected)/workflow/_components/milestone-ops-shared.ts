import {
  datesMilestoneDataSchema,
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  igProfileMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
  menuTaggerMilestoneDataSchema,
  postLineupMilestoneDataSchema,
  reelLineupMilestoneDataSchema,
  schedulerMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

import type {
  MilestoneDataValue,
  PassCriteriaRow,
  PassCriteriaStatus,
  TimelineMilestone,
} from './timeline/types'

export type MilestoneOpsContext = {
  workflowId: string
  locationId: number
  /** `useTranslations('analytics.workflows.chat')` */
  t: (key: string) => string
}

export function parseDataPreviewForPreset(
  presetId: TimelineMilestone['presetId'],
  dataPreview: object,
): MilestoneDataValue | undefined {
  if (presetId === 'dates') {
    const parsed = datesMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'restaurant_campaign_brief') {
    const parsed = campaignBriefMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'promotion_candidates') {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'menu_tagger') {
    const parsed = menuTaggerMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'reel_lineup') {
    const parsed = reelLineupMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'post_lineup') {
    const parsed = postLineupMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'culture_hooks') {
    const parsed = cultureHooksMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'ig_profile') {
    const parsed = igProfileMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'scheduler') {
    const parsed = schedulerMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  return undefined
}

export function ensurePassCriteriaIds(
  rows: Array<{ id?: string; requirement: string; status: PassCriteriaStatus }>,
): PassCriteriaRow[] {
  return rows.map((row) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
  }))
}
