import type { MilestoneInput } from '@/lib/graphql/node-schemas'
import { promotionCandidatesMilestoneInputValueSchema } from '@/lib/graphql/node-schemas'
import {
  milestonePresetInputType,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'

/** Presets whose Input tab uses the default optional owner-notes textarea (not custom widgets like dates). */
export function milestonePresetHasDefaultOptionalNotesInput(
  presetId: MilestonePresetId | undefined,
): presetId is
  | 'restaurant_campaign_brief'
  | 'post_scheduler'
  | 'culture_hooks'
  | 'format_mix'
  | 'ig_profile'
  | 'menu_tagger' {
  return milestonePresetInputType(presetId) === 'optional_notes'
}

export function optionalNotesFromMilestoneInput(
  raw: MilestoneInput | undefined,
  presetId:
    | 'restaurant_campaign_brief'
    | 'post_scheduler'
    | 'culture_hooks'
    | 'format_mix'
    | 'ig_profile'
    | 'menu_tagger',
): string {
  if (raw?.type !== presetId || raw.value == null || typeof raw.value !== 'object') {
    return ''
  }
  const n = (raw.value as { notes?: unknown }).notes
  return typeof n === 'string' ? n : ''
}

const DEFAULT_PROMOTION_CANDIDATES_INPUT = {
  notes: '',
  selectedMenuCategories: [] as string[],
  starItemLimit: 5 as const,
  puzzleItemLimit: 10 as const,
}

export function promotionCandidatesInputFromMilestoneInput(raw: MilestoneInput | undefined): {
  notes: string
  selectedMenuCategories: string[]
  starItemLimit: 5 | 10 | 'all'
  puzzleItemLimit: 5 | 10 | 'all'
} {
  if (raw?.type !== 'promotion_candidates' || raw.value == null || typeof raw.value !== 'object') {
    return { ...DEFAULT_PROMOTION_CANDIDATES_INPUT }
  }
  const parsed = promotionCandidatesMilestoneInputValueSchema.safeParse(raw.value)
  if (!parsed.success) {
    const legacyNotes = (raw.value as { notes?: unknown }).notes
    return {
      notes: typeof legacyNotes === 'string' ? legacyNotes : '',
      selectedMenuCategories: [],
      starItemLimit: 5,
      puzzleItemLimit: 10,
    }
  }
  return parsed.data
}

function normalizeItemLimit(value: unknown, fallback: 5 | 10 | 'all'): 5 | 10 | 'all' {
  if (value === 5 || value === 10 || value === 'all') return value
  return fallback
}

export function normalizePromotionCandidatesInput(value: {
  notes: string
  selectedMenuCategories: string[]
  starItemLimit?: 5 | 10 | 'all'
  puzzleItemLimit?: 5 | 10 | 'all'
}): {
  notes: string
  selectedMenuCategories: string[]
  starItemLimit: 5 | 10 | 'all'
  puzzleItemLimit: 5 | 10 | 'all'
} {
  const seen = new Set<string>()
  const selectedMenuCategories: string[] = []
  for (const raw of value.selectedMenuCategories) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    selectedMenuCategories.push(name)
  }
  return {
    notes: value.notes.trim(),
    selectedMenuCategories,
    starItemLimit: normalizeItemLimit(value.starItemLimit, 5),
    puzzleItemLimit: normalizeItemLimit(value.puzzleItemLimit, 10),
  }
}
