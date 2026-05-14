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
  | 'culture_hooks'
  | 'ig_profile'
  | 'menu_tagger'
  | 'reel_lineup' {
  return milestonePresetInputType(presetId) === 'optional_notes'
}

export function optionalNotesFromMilestoneInput(
  raw: MilestoneInput | undefined,
  presetId:
    | 'restaurant_campaign_brief'
    | 'culture_hooks'
    | 'ig_profile'
    | 'menu_tagger'
    | 'reel_lineup',
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
  ignoredMenuItemsText: '',
  starItemLimit: 5 as const,
  puzzleItemLimit: 10 as const,
}

export function promotionCandidatesInputFromMilestoneInput(raw: MilestoneInput | undefined): {
  notes: string
  selectedMenuCategories: string[]
  ignoredMenuItemsText: string
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
      ignoredMenuItemsText: '',
      starItemLimit: 5,
      puzzleItemLimit: 10,
    }
  }
  return {
    notes: parsed.data.notes,
    selectedMenuCategories: parsed.data.selectedMenuCategories,
    ignoredMenuItemsText: parsed.data.ignoredMenuItems.join('\n'),
    starItemLimit: parsed.data.starItemLimit,
    puzzleItemLimit: parsed.data.puzzleItemLimit,
  }
}

function normalizeItemLimit(value: unknown, fallback: 5 | 10 | 'all'): 5 | 10 | 'all' {
  if (value === 5 || value === 10 || value === 'all') return value
  return fallback
}

function normalizeIgnoredMenuItemsFromText(text: string): string[] {
  const seen = new Set<string>()
  const ignoredMenuItems: string[] = []
  for (const raw of text.split('\n')) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    ignoredMenuItems.push(name)
  }
  return ignoredMenuItems
}

export function normalizedPromotionCandidatesInputsEqual(
  a: {
    notes: string
    selectedMenuCategories: string[]
    ignoredMenuItems: string[]
    starItemLimit: 5 | 10 | 'all'
    puzzleItemLimit: 5 | 10 | 'all'
  },
  b: {
    notes: string
    selectedMenuCategories: string[]
    ignoredMenuItems: string[]
    starItemLimit: 5 | 10 | 'all'
    puzzleItemLimit: 5 | 10 | 'all'
  },
): boolean {
  if (a.notes !== b.notes) return false
  if (a.starItemLimit !== b.starItemLimit) return false
  if (a.puzzleItemLimit !== b.puzzleItemLimit) return false
  if (a.selectedMenuCategories.length !== b.selectedMenuCategories.length) return false
  if (!a.selectedMenuCategories.every((v, i) => v === b.selectedMenuCategories[i])) {
    return false
  }
  if (a.ignoredMenuItems.length !== b.ignoredMenuItems.length) return false
  return a.ignoredMenuItems.every((v, i) => v === b.ignoredMenuItems[i])
}

export function promotionCandidatesDraftFromNormalized(value: {
  notes: string
  selectedMenuCategories: string[]
  ignoredMenuItems: string[]
  starItemLimit: 5 | 10 | 'all'
  puzzleItemLimit: 5 | 10 | 'all'
}): {
  notes: string
  selectedMenuCategories: string[]
  ignoredMenuItemsText: string
  starItemLimit: 5 | 10 | 'all'
  puzzleItemLimit: 5 | 10 | 'all'
} {
  return {
    notes: value.notes,
    selectedMenuCategories: value.selectedMenuCategories,
    ignoredMenuItemsText: value.ignoredMenuItems.join('\n'),
    starItemLimit: value.starItemLimit,
    puzzleItemLimit: value.puzzleItemLimit,
  }
}

export function normalizePromotionCandidatesInput(value: {
  notes: string
  selectedMenuCategories: string[]
  ignoredMenuItemsText: string
  starItemLimit?: 5 | 10 | 'all'
  puzzleItemLimit?: 5 | 10 | 'all'
}): {
  notes: string
  selectedMenuCategories: string[]
  ignoredMenuItems: string[]
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
    ignoredMenuItems: normalizeIgnoredMenuItemsFromText(value.ignoredMenuItemsText),
    starItemLimit: normalizeItemLimit(value.starItemLimit, 5),
    puzzleItemLimit: normalizeItemLimit(value.puzzleItemLimit, 10),
  }
}
