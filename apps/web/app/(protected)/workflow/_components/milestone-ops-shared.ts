import {
  datesMilestoneDataSchema,
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  formatMixMilestoneDataSchema,
  igProfileMilestoneDataSchema,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
  menuTaggerMilestoneDataSchema,
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
  if (presetId === 'post_scheduler') {
    const parsed = postSchedulerMilestoneDataSchema.safeParse(dataPreview)
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
  if (presetId === 'culture_hooks') {
    const parsed = cultureHooksMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'format_mix') {
    const parsed = formatMixMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'ig_profile') {
    const parsed = igProfileMilestoneDataSchema.safeParse(dataPreview)
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
