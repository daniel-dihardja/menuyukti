/**
 * Public milestone-run skill metadata for UI. Keep in sync with
 * `apps/agents/agents/core/milestone_run/skills.py` (`_build_registry` — id, name, description only).
 */
import 'server-only'

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
    id: 'generic',
    name: 'Generic milestone data prep',
    description:
      'Use for standard milestone runs: read goal, criteria, and Data tab; improve or complete the Data tab (Markdown). Evaluation and summary run automatically after skills.',
  },
] as const
