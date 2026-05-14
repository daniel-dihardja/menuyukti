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
      "Use when a milestone explicitly needs holiday lookup/confirmation for a date range for this location's country.",
  },
  {
    id: 'campaign_brief',
    name: 'Campaign brief',
    description:
      'Use for the campaign brief milestone: campaign window and holidays plus profile and operating signals—venue snapshot, pillars, audience hypotheses, proof-oriented angles, and tone guardrails.',
  },
  {
    id: 'culture_hooks',
    name: 'Culture hooks',
    description:
      'Use for the culture hooks milestone: reads Campaign Brief only, infers location concept and target audience, then proposes non-food intersection topics for culturally relevant Instagram content.',
  },
  {
    id: 'generic',
    name: 'Generic milestone data prep',
    description:
      'Use for standard milestone runs: read goal, criteria, and milestone data; improve or complete structured JSON for the preset. Evaluation and summary run automatically after skills.',
  },
] as const
