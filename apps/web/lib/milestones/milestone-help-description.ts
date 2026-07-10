import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'

/** Translation keys under `analytics.workflows.chat` for preset default goal / Help-tab body. */
export const PRESET_GOAL_TRANSLATION_KEYS = {
  dates: 'milestonePreset.dates.goal',
  restaurant_campaign_brief: 'milestonePreset.restaurant_campaign_brief.goal',
  promotion_candidates: 'milestonePreset.promotion_candidates.goal',
  menu_tagger: 'milestonePreset.menu_tagger.goal',
  menu_clusterer: 'milestonePreset.menu_clusterer.goal',
  post_lineup: 'milestonePreset.post_lineup.goal',
  reel_lineup: 'milestonePreset.reel_lineup.goal',
  story_lineup: 'milestonePreset.story_lineup.goal',
  culture_hooks: 'milestonePreset.culture_hooks.goal',
  ig_profile: 'milestonePreset.ig_profile.goal',
  ig_plan: 'milestonePreset.ig_plan.goal',
  scheduler: 'milestonePreset.scheduler.goal',
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
