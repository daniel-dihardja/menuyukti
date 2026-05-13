import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'

/** Translation keys under `analytics.workflows.chat` for preset default goal / Help-tab body. */
export const PRESET_GOAL_TRANSLATION_KEYS = {
  restaurant_campaign_brief: 'milestonePreset.restaurant_campaign_brief.goal',
  post_scheduler: 'milestonePreset.post_scheduler.goal',
  promotion_candidates: 'milestonePreset.promotion_candidates.goal',
  culture_hooks: 'milestonePreset.culture_hooks.goal',
  format_mix: 'milestonePreset.format_mix.goal',
  ig_profile: 'milestonePreset.ig_profile.goal',
} as const

/** Matches `useTranslations('analytics.workflows.chat')`. */
export type MilestoneHelpTranslateFn = (key: string) => string

/**
 * Same precedence as the milestone Help tab: preset catalog goal → custom goal → fallback.
 */
export function getMilestoneHelpDescription(
  milestone: Pick<TimelineMilestone, 'goal' | 'presetId'>,
  t: MilestoneHelpTranslateFn,
): string {
  const presetGoalKey = milestone.presetId
    ? PRESET_GOAL_TRANSLATION_KEYS[milestone.presetId as keyof typeof PRESET_GOAL_TRANSLATION_KEYS]
    : undefined
  const presetDescription = presetGoalKey ? t(presetGoalKey) : ''
  const customDescription = milestone.goal?.trim() ?? ''
  return presetDescription || customDescription || t('milestoneHelpWhatItDoesFallback')
}
