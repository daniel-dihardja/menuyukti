import type { MilestoneInput } from '@/lib/graphql/node-schemas'
import {
  promotionCandidatesMilestoneInputValueSchema,
  menuClustererMilestoneInputValueSchema,
  igMenuPickerMilestoneInputValueSchema,
} from '@/lib/graphql/node-schemas'
import { IG_MENU_PICKER_NONE_SELECTED_SENTINEL } from '@/lib/milestones/ig-menu-picker-input'
import {
  milestonePresetInputType,
  type MilestonePresetId,
  type MilestonePresetInputType,
} from '@/lib/milestones/preset-definitions'

/** Complex input forms (checkboxes, selects) use explicit Save; simple fields keep debounced autosave. */
export function milestonePresetUsesManualInputSave(inputType: MilestonePresetInputType): boolean {
  switch (inputType) {
    case 'promotion_candidates':
    case 'campaign_brief':
    case 'menu_clusterer':
    case 'ig_menu_picker':
      return true
    default:
      return false
  }
}

/** Presets whose Input tab uses the default optional owner-notes textarea (not custom widgets like dates). */
export function milestonePresetHasDefaultOptionalNotesInput(
  presetId: MilestonePresetId | undefined,
): presetId is
  | 'culture_hooks'
  | 'ig_profile'
  | 'ig_plan'
  | 'menu_tagger'
  | 'post_lineup'
  | 'reel_lineup'
  | 'story_lineup'
  | 'scheduler' {
  return milestonePresetInputType(presetId) === 'optional_notes'
}

export function optionalNotesFromMilestoneInput(
  raw: MilestoneInput | undefined,
  presetId:
    | 'restaurant_campaign_brief'
    | 'culture_hooks'
    | 'ig_profile'
    | 'ig_plan'
    | 'menu_tagger'
    | 'post_lineup'
    | 'reel_lineup'
    | 'story_lineup'
    | 'scheduler',
): string {
  if (raw?.type !== presetId || raw.value == null || typeof raw.value !== 'object') {
    return ''
  }
  const n = (raw.value as { notes?: unknown }).notes
  return typeof n === 'string' ? n : ''
}

const DEFAULT_MENU_CLUSTERER_INPUT = {
  notes: '',
  targetGroupCount: undefined as number | undefined,
}

export function menuClustererInputFromMilestoneInput(raw: MilestoneInput | undefined): {
  notes: string
  targetGroupCount?: number
} {
  if (raw?.type !== 'menu_clusterer' || raw.value == null || typeof raw.value !== 'object') {
    return { ...DEFAULT_MENU_CLUSTERER_INPUT }
  }
  const parsed = menuClustererMilestoneInputValueSchema.safeParse(raw.value)
  if (!parsed.success) {
    const legacy = raw.value as { notes?: unknown; targetGroupCount?: unknown }
    const legacyCount = legacy.targetGroupCount
    return {
      notes: typeof legacy.notes === 'string' ? legacy.notes : '',
      targetGroupCount:
        typeof legacyCount === 'number' && Number.isInteger(legacyCount) ? legacyCount : undefined,
    }
  }
  return {
    notes: parsed.data.notes,
    targetGroupCount: parsed.data.targetGroupCount,
  }
}

export function normalizeMenuClustererInput(value: { notes: string; targetGroupCount?: number }): {
  notes: string
  targetGroupCount?: number
} {
  const notes = value.notes.trim()
  const targetGroupCount =
    typeof value.targetGroupCount === 'number' && Number.isInteger(value.targetGroupCount)
      ? value.targetGroupCount
      : undefined
  return targetGroupCount === undefined ? { notes } : { notes, targetGroupCount }
}

export function normalizedMenuClustererInputsEqual(
  a: { notes: string; targetGroupCount?: number },
  b: { notes: string; targetGroupCount?: number },
): boolean {
  return a.notes === b.notes && a.targetGroupCount === b.targetGroupCount
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

const DEFAULT_IG_MENU_PICKER_INPUT = {
  notes: '',
  selectedSlotKeys: [] as string[],
}

export function igMenuPickerInputFromMilestoneInput(raw: MilestoneInput | undefined): {
  notes: string
  selectedSlotKeys: string[]
} {
  if (raw?.type !== 'ig_menu_picker' || raw.value == null || typeof raw.value !== 'object') {
    return { ...DEFAULT_IG_MENU_PICKER_INPUT }
  }
  const parsed = igMenuPickerMilestoneInputValueSchema.safeParse(raw.value)
  if (!parsed.success) {
    const legacy = raw.value as { notes?: unknown; selectedSlotKeys?: unknown }
    const keys = Array.isArray(legacy.selectedSlotKeys)
      ? legacy.selectedSlotKeys.filter((k): k is string => typeof k === 'string')
      : []
    return {
      notes: typeof legacy.notes === 'string' ? legacy.notes : '',
      selectedSlotKeys: keys,
    }
  }
  return {
    notes: parsed.data.notes,
    selectedSlotKeys: parsed.data.selectedSlotKeys,
  }
}

export function normalizeIgMenuPickerInput(value: { notes: string; selectedSlotKeys: string[] }): {
  notes: string
  selectedSlotKeys: string[]
} {
  const seen = new Set<string>()
  const selectedSlotKeys: string[] = []
  for (const raw of value.selectedSlotKeys) {
    const key = raw.trim()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    selectedSlotKeys.push(key)
  }
  if (
    selectedSlotKeys.length === 1 &&
    selectedSlotKeys[0] === IG_MENU_PICKER_NONE_SELECTED_SENTINEL
  ) {
    return { notes: value.notes.trim(), selectedSlotKeys }
  }
  const withoutSentinel = selectedSlotKeys.filter(
    (key) => key !== IG_MENU_PICKER_NONE_SELECTED_SENTINEL,
  )
  return {
    notes: value.notes.trim(),
    selectedSlotKeys: withoutSentinel,
  }
}

export function igMenuPickerInputEqual(
  a: { notes: string; selectedSlotKeys: string[] },
  b: { notes: string; selectedSlotKeys: string[] },
): boolean {
  if (a.notes !== b.notes) return false
  if (a.selectedSlotKeys.length !== b.selectedSlotKeys.length) return false
  return a.selectedSlotKeys.every((v, i) => v === b.selectedSlotKeys[i])
}

export function normalizedIgMenuPickerInputsEqual(
  a: { notes: string; selectedSlotKeys: string[] },
  b: { notes: string; selectedSlotKeys: string[] },
): boolean {
  return igMenuPickerInputEqual(normalizeIgMenuPickerInput(a), normalizeIgMenuPickerInput(b))
}
