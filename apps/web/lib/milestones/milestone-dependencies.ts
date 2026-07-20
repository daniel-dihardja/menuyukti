import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import type { MilestonePresetId } from '@/lib/graphql/node-schemas'

/** Field names stored on `milestoneInput.value` for explicit upstream bindings. */
export const MILESTONE_DEPENDENCY_FIELDS = [
  'sourceCampaignBriefMilestoneId',
  'sourcePromotionCandidatesMilestoneId',
  'sourceMenuTaggerMilestoneId',
  'sourceIgPlanMilestoneId',
  'sourceIgMenuPickerMilestoneId',
  'sourceIgFormatMilestoneId',
  'sourceDatesMilestoneId',
] as const

export type MilestoneDependencyField = (typeof MILESTONE_DEPENDENCY_FIELDS)[number]

export type MilestoneDependencyPort = {
  field: MilestoneDependencyField
  requiredPresetId: MilestonePresetId
  /** next-intl key under `analytics.workflows.chat` */
  labelKey: string
}

/**
 * Declared upstream ports per consumer preset.
 * Candidates are milestones earlier in timeline order with matching `presetId`.
 */
export const MILESTONE_DEPENDENCY_PORTS: Partial<
  Record<MilestonePresetId, readonly MilestoneDependencyPort[]>
> = {
  promotion_candidates: [
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
  ],
  culture_hooks: [
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
  ],
  ig_profile: [
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
  ],
  ig_plan: [
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
  ],
  menu_tagger: [
    {
      field: 'sourcePromotionCandidatesMilestoneId',
      requiredPresetId: 'promotion_candidates',
      labelKey: 'milestoneDependencyPromotionCandidatesLabel',
    },
  ],
  menu_clusterer: [
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
    {
      field: 'sourceMenuTaggerMilestoneId',
      requiredPresetId: 'menu_tagger',
      labelKey: 'milestoneDependencyMenuTaggerLabel',
    },
  ],
  ig_menu_picker: [
    {
      field: 'sourceIgPlanMilestoneId',
      requiredPresetId: 'ig_plan',
      labelKey: 'milestoneDependencyIgPlanLabel',
    },
  ],
  ig_format: [
    {
      field: 'sourceIgMenuPickerMilestoneId',
      requiredPresetId: 'ig_menu_picker',
      labelKey: 'milestoneDependencyIgMenuPickerLabel',
    },
  ],
  ig_text: [
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
    {
      field: 'sourceIgFormatMilestoneId',
      requiredPresetId: 'ig_format',
      labelKey: 'milestoneDependencyIgFormatLabel',
    },
  ],
  scheduler: [
    {
      field: 'sourceDatesMilestoneId',
      requiredPresetId: 'dates',
      labelKey: 'milestoneDependencyDatesLabel',
    },
    {
      field: 'sourceCampaignBriefMilestoneId',
      requiredPresetId: 'restaurant_campaign_brief',
      labelKey: 'milestoneDependencyCampaignBriefLabel',
    },
  ],
}

export function dependencyPortsForPreset(
  presetId: MilestonePresetId | undefined,
): readonly MilestoneDependencyPort[] {
  if (!presetId) {
    return []
  }
  return MILESTONE_DEPENDENCY_PORTS[presetId] ?? []
}

export function isMilestoneDependencyField(value: string): value is MilestoneDependencyField {
  return (MILESTONE_DEPENDENCY_FIELDS as readonly string[]).includes(value)
}

/** Extract known dependency id fields from a milestoneInput.value object. */
export function dependencyIdsFromValue(
  value: unknown,
): Partial<Record<MilestoneDependencyField, string>> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const record = value as Record<string, unknown>
  const out: Partial<Record<MilestoneDependencyField, string>> = {}
  for (const field of MILESTONE_DEPENDENCY_FIELDS) {
    const raw = record[field]
    if (typeof raw === 'string' && raw.trim()) {
      out[field] = raw.trim()
    }
  }
  return out
}

/** Merge dependency ids from an existing input value onto a newly built value payload. */
export function withPreservedDependencyIds<T extends Record<string, unknown>>(
  nextValue: T,
  existingValue: unknown,
): T {
  const deps = dependencyIdsFromValue(existingValue)
  if (Object.keys(deps).length === 0) {
    return nextValue
  }
  return { ...deps, ...nextValue }
}

export function listDependencyCandidates(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  requiredPresetId: MilestonePresetId,
): TimelineMilestone[] {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return []
  }
  const candidates: TimelineMilestone[] = []
  for (let i = 0; i < index; i += 1) {
    const row = milestones[i]
    if (row?.presetId === requiredPresetId) {
      candidates.push(row)
    }
  }
  return candidates
}

/** Nearest prior milestone of the required preset (timeline order). */
export function defaultDependencyId(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  requiredPresetId: MilestonePresetId,
): string | undefined {
  const candidates = listDependencyCandidates(milestones, currentMilestoneId, requiredPresetId)
  if (candidates.length === 0) {
    return undefined
  }
  return candidates[candidates.length - 1]?.id
}

/**
 * Resolve a dependency: use selected id when it is a valid prior of the required type;
 * otherwise fall back to nearest prior.
 */
export function resolveDependencyMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  requiredPresetId: MilestonePresetId,
  selectedId: string | undefined,
): TimelineMilestone | undefined {
  const candidates = listDependencyCandidates(milestones, currentMilestoneId, requiredPresetId)
  if (candidates.length === 0) {
    return undefined
  }
  const trimmed = selectedId?.trim()
  if (trimmed) {
    const match = candidates.find((row) => row.id === trimmed)
    if (match) {
      return match
    }
  }
  return candidates[candidates.length - 1]
}

export function selectedDependencyIdFromInput(
  milestoneInput: { value?: unknown } | undefined,
  field: MilestoneDependencyField,
): string | undefined {
  const deps = dependencyIdsFromValue(milestoneInput?.value)
  return deps[field]
}

export function dependencyOptionLabel(milestone: TimelineMilestone): string {
  const title = milestone.title?.trim() || 'Milestone'
  const code = milestone.displayCode?.trim() || milestone.id
  return `${code} · ${title}`
}
