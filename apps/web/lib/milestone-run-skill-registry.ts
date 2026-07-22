/**
 * Milestone preset run metadata for the Skills catalog UI. Keep in sync with
 * `MILESTONE_PRESET_IDS` in `lib/graphql/node-schemas/milestone-presets.ts` and
 * `register_preset_runner` in `apps/agents/agents/core/milestone_run/graph.py`.
 */

import { MILESTONE_PRESET_IDS, type MilestonePresetId } from '@/lib/graphql/node-schemas'

export type MilestonePresetRunMeta = {
  id: MilestonePresetId
  name: string
  description: string
}

/** Order matches `MILESTONE_PRESET_IDS`. */
export const MILESTONE_PRESET_RUN_REGISTRY: readonly MilestonePresetRunMeta[] = [
  {
    id: 'dates',
    name: 'Dates',
    description:
      'Resolve the campaign date window and list public holidays between startDate and endDate for this location.',
  },
  {
    id: 'restaurant_campaign_brief',
    name: 'Campaign brief',
    description:
      'Build a factual campaign brief foundation: venue snapshot, strategy, objective, segments, messaging, content pillars, and guardrails grounded in analytics.',
  },
  {
    id: 'promotion_candidates',
    name: 'Promotion candidates',
    description:
      'Fetch promotion-engineering candidates and present star and puzzle menu items by POS menu category for storytelling emphasis.',
  },
  {
    id: 'menu_tagger',
    name: 'Menu tagger',
    description:
      'Read prior Promotion Candidates and attach fixed taxonomy v2 tags to every star and puzzle menu item.',
  },
  {
    id: 'menu_clusterer',
    name: 'Menu clusterer',
    description:
      'Build one top_five group per POS category from tagged star items (up to five dishes), with cluster descriptions tied to campaign strategy.',
  },
  {
    id: 'culture_hooks',
    name: 'Culture hooks',
    description:
      'Infer heritage/origin places from the Campaign Brief and list non-food topics the local target audience would find interesting, for culturally relevant Instagram posts, Stories, and Reels.',
  },
  {
    id: 'ig_profile',
    name: 'IG Profile',
    description:
      'Generate Instagram username options and bio variations aligned with brand, audience, and campaign objective from the Campaign Brief.',
  },
  {
    id: 'ig_plan',
    name: 'IG Plan',
    description:
      'Read prior Campaign Brief strategy together with venue slot demand signals and menu engineering portfolio distribution from the workflow-pinned analytics run, then build a weekly slot strategy grid (objectives, pillars, slotStrategy, productRole). Strategy only — no dish names or formats.',
  },
  {
    id: 'ig_menu_picker',
    name: 'IG Menu Picker',
    description:
      'Read prior IG Plan entries, fetch slot menu candidates from the workflow-pinned sales report, and attach 1–3 menu items per selected slot.',
  },
  {
    id: 'ig_format',
    name: 'IG Format',
    description:
      'Read prior IG Menu Picker entries with menu items and assign an Instagram format (reel, post, post-carousel, or story) per slot with a short rationale.',
  },
  {
    id: 'ig_text',
    name: 'IG Text',
    description:
      'Read prior IG Format entries and Campaign Brief orientation, then generate Instagram copy as texts per slot while preserving plan strategy, dishes, and format assignments.',
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    description:
      'Place feed posts, Stories, and Reels on the calendar with explicit slot kinds and core cadence rules for the campaign window.',
  },
] as const

/** @deprecated Use `MILESTONE_PRESET_RUN_REGISTRY`. Kept for transitional imports. */
export const MILESTONE_RUN_SKILL_REGISTRY = MILESTONE_PRESET_RUN_REGISTRY

/** @deprecated Use `MilestonePresetRunMeta`. */
export type MilestoneRunSkillMeta = MilestonePresetRunMeta

/** Guard: registry ids must match the GraphQL preset enum order. */
export function assertPresetRunRegistryInSync(): void {
  const registryIds = MILESTONE_PRESET_RUN_REGISTRY.map((row) => row.id)
  if (registryIds.length !== MILESTONE_PRESET_IDS.length) {
    throw new Error('MILESTONE_PRESET_RUN_REGISTRY length does not match MILESTONE_PRESET_IDS')
  }
  for (let i = 0; i < registryIds.length; i++) {
    if (registryIds[i] !== MILESTONE_PRESET_IDS[i]) {
      throw new Error(
        `MILESTONE_PRESET_RUN_REGISTRY out of sync at index ${i}: ${registryIds[i]} vs ${MILESTONE_PRESET_IDS[i]}`,
      )
    }
  }
}
