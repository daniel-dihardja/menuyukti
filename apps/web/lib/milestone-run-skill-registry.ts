/**
 * Public milestone-run skill metadata for UI. Keep in sync with
 * `apps/agents/agents/core/milestone_run/skills.py` (`_build_registry` — id, name, description only).
 */

export type MilestoneRunSkillMeta = {
  id: string
  name: string
  description: string
}

/** Order matches Python `_build_registry` insertion order. */
export const MILESTONE_RUN_SKILL_REGISTRY: readonly MilestoneRunSkillMeta[] = [
  {
    id: 'public_holidays',
    name: 'Public holidays',
    description:
      "Use when the milestone goal or pass criteria require listing, confirming, or filling in public holidays for a date range for this location's country.",
  },
  {
    id: 'brand_brief',
    name: 'Brand brief',
    description:
      'Use for the brand brief milestone: location-only brief from profile and operating signals—venue snapshot, pillars, audience hypotheses, tone guardrails. No campaign start/end dates.',
  },
  {
    id: 'promotion_candidates',
    name: 'Promotion candidates',
    description:
      'Use for the promotion candidates milestone: menu engineering top stars and puzzles per POS menu_category (or flat when categories are missing) from the latest analytics run. When a prior brand brief milestone exists, align promotion ideas with its pillars, audience, proof angles, and tone; menu names stay grounded in analytics.',
  },
  {
    id: 'post_scheduler',
    name: 'Post scheduler',
    description:
      'Use for the post scheduler milestone: builds an Instagram posting plan from prior Dates (campaign window and public holidays), Brand Brief, and Promotion Candidates; uses get_available_dates to filter posting days by weekends and holidays when needed.',
  },
  {
    id: 'generic',
    name: 'Generic milestone data prep',
    description:
      'Use for standard milestone runs: read goal, criteria, and milestone data; improve or complete structured JSON for the preset. Evaluation and summary run automatically after skills.',
  },
] as const
