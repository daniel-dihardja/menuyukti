import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import { igPlanMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  milestonePresetUsesManualInputSave,
  normalizePromotionCandidatesInput,
  optionalNotesFromMilestoneInput,
  promotionCandidatesInputFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import {
  getMilestonePresetCreateFields,
  milestonePresetInputType,
} from '@/lib/milestones/preset-definitions'

describe('milestone optional notes', () => {
  it('milestonePresetHasDefaultOptionalNotesInput includes supported presets', () => {
    expect(milestonePresetHasDefaultOptionalNotesInput('restaurant_campaign_brief')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput('promotion_candidates')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput('culture_hooks')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('ig_profile')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('ig_plan')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('menu_tagger')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('menu_clusterer')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput('post_lineup')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('scheduler')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('dates')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput(undefined)).toBe(false)
  })

  it('milestonePresetUsesManualInputSave marks complex input presets only', () => {
    expect(milestonePresetUsesManualInputSave('promotion_candidates')).toBe(true)
    expect(milestonePresetUsesManualInputSave('campaign_brief')).toBe(true)
    expect(milestonePresetUsesManualInputSave('menu_clusterer')).toBe(true)
    expect(milestonePresetUsesManualInputSave('ig_menu_picker')).toBe(true)
    expect(milestonePresetUsesManualInputSave('dates')).toBe(false)
    expect(milestonePresetUsesManualInputSave('optional_notes')).toBe(false)
    expect(milestonePresetUsesManualInputSave('none')).toBe(false)
    expect(
      milestonePresetUsesManualInputSave(milestonePresetInputType('promotion_candidates')),
    ).toBe(true)
    expect(milestonePresetUsesManualInputSave(milestonePresetInputType('ig_plan'))).toBe(false)
  })

  it('promotionCandidatesInputFromMilestoneInput reads notes and categories', () => {
    expect(
      promotionCandidatesInputFromMilestoneInput({
        type: 'promotion_candidates',
        value: { notes: 'focus lunch', selectedMenuCategories: ['Mains', 'Mains'] },
      }),
    ).toEqual({
      notes: 'focus lunch',
      selectedMenuCategories: ['Mains', 'Mains'],
      ignoredMenuItemsText: '',
      starItemLimit: 5,
      puzzleItemLimit: 10,
    })
    expect(
      promotionCandidatesInputFromMilestoneInput({
        type: 'promotion_candidates',
        value: {
          notes: '',
          selectedMenuCategories: [],
          ignoredMenuItems: ['TEH', 'AIR MINERAL'],
        },
      }),
    ).toEqual({
      notes: '',
      selectedMenuCategories: [],
      ignoredMenuItemsText: 'TEH\nAIR MINERAL',
      starItemLimit: 5,
      puzzleItemLimit: 10,
    })
    expect(
      normalizePromotionCandidatesInput({
        notes: '  focus  ',
        selectedMenuCategories: ['Mains', 'mains', 'Desserts'],
        ignoredMenuItemsText: 'TEH\n  teh \nAIR MINERAL\n',
        starItemLimit: 10,
        puzzleItemLimit: 'all',
      }),
    ).toEqual({
      notes: 'focus',
      selectedMenuCategories: ['Mains', 'Desserts'],
      ignoredMenuItems: ['TEH', 'AIR MINERAL'],
      starItemLimit: 10,
      puzzleItemLimit: 'all',
    })
  })

  it('patchMilestoneSchema accepts promotion_candidates milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'promotion_candidates',
        value: {
          notes: 'seasonal',
          selectedMenuCategories: ['Mains'],
          ignoredMenuItems: ['TEH', 'AIR MINERAL'],
          starItemLimit: 10,
          puzzleItemLimit: 'all',
        },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'promotion_candidates',
        value: {
          notes: 'seasonal',
          selectedMenuCategories: ['Mains'],
          ignoredMenuItems: ['TEH', 'AIR MINERAL'],
          starItemLimit: 10,
          puzzleItemLimit: 'all',
        },
      })
    }
  })

  it('patchMilestoneSchema accepts campaign brief notes-only milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'restaurant_campaign_brief',
        value: { notes: 'focus weekday lunch' },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'restaurant_campaign_brief',
        value: { notes: 'focus weekday lunch' },
      })
    }
  })

  it('getMilestonePresetCreateFields seeds promotion_candidates milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('promotion_candidates', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'promotion_candidates',
      value: {
        notes: '',
        selectedMenuCategories: [],
        ignoredMenuItems: [],
        starItemLimit: 5,
        puzzleItemLimit: 10,
      },
    })
  })

  it('patchMilestoneSchema accepts culture_hooks milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'culture_hooks', value: { notes: 'focus on heritage values' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'culture_hooks',
        value: { notes: 'focus on heritage values' },
      })
    }
  })

  it('patchMilestoneSchema accepts ig_profile milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'ig_profile', value: { notes: 'short handles only' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'ig_profile',
        value: { notes: 'short handles only' },
      })
    }
  })

  it('patchMilestoneSchema accepts ig_plan milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'ig_plan', value: { notes: 'emphasize lunch reels' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'ig_plan',
        value: { notes: 'emphasize lunch reels' },
      })
    }
  })

  it('patchMilestoneSchema accepts ig_plan milestoneData', () => {
    const parsed = patchMilestoneSchema.safeParse({
      presetId: 'ig_plan',
      milestoneData: {
        scheduleExplanation: 'Push weak afternoon slots with hero puzzle discovery.',
        entries: [
          {
            day: 'wednesday',
            slot: '14:30',
            objective: 'Increase afternoon traffic',
            pillar: 'hero',
            mealPeriod: 'afternoon',
            productRole: 'puzzle',
            slotStrategy: 'aggressively_grow',
            slotKey: 'wednesday-afternoon',
          },
        ],
        sourceAnalyticsRunId: '42',
        reportingPeriod: '2025-01-01 to 2025-03-31',
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('patchMilestoneSchema accepts ig_plan empty milestoneData seed', () => {
    const parsed = patchMilestoneSchema.safeParse({
      presetId: 'ig_plan',
      milestoneData: {
        scheduleExplanation: '',
        entries: [],
        sourceAnalyticsRunId: '',
        reportingPeriod: '',
      },
      milestoneInput: { type: 'ig_plan', value: { notes: '' } },
    })
    expect(parsed.success).toBe(true)
  })

  it('patchMilestoneSchema accepts ig_profile empty milestoneData seed', () => {
    const parsed = patchMilestoneSchema.safeParse({
      presetId: 'ig_profile',
      milestoneData: {
        usernames: [],
        bios: [],
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('patchMilestoneSchema accepts dates milestoneInput and milestoneData', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'dates', value: { startDate: '2026-06-01', endDate: '2026-06-30' } },
      milestoneData: {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        publicHolidays: [],
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('patchMilestoneSchema accepts goal-only patch', () => {
    const parsed = patchMilestoneSchema.safeParse({ goal: 'Increase repeat visits' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.goal).toBe('Increase repeat visits')
    }
  })

  it('patchMilestoneSchema accepts name-only patch', () => {
    const parsed = patchMilestoneSchema.safeParse({ name: 'Campaign brief' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.name).toBe('Campaign brief')
    }
  })

  it('patchMilestoneSchema accepts passCriterias with stable ids', () => {
    const parsed = patchMilestoneSchema.safeParse({
      passCriterias: [{ id: 'pc-1', requirement: 'Has baseline', status: 'open' }],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.passCriterias).toEqual([
        { id: 'pc-1', requirement: 'Has baseline', status: 'open' },
      ])
    }
  })

  it('getMilestonePresetCreateFields seeds dates milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('dates', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'dates',
      value: { startDate: '', endDate: '' },
    })
    expect(fields.milestoneData).toEqual({
      startDate: '',
      endDate: '',
      publicHolidays: [],
    })
  })

  it('getMilestonePresetCreateFields seeds culture_hooks milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('culture_hooks', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'culture_hooks',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      locationConcept: '',
      targetAudience: '',
      intersections: [],
      guardrailCheck: '',
    })
  })

  it('getMilestonePresetCreateFields seeds campaign brief notes-only milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('restaurant_campaign_brief', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'restaurant_campaign_brief',
      value: {
        notes: '',
        reflection: { enabled: true, maxRevisions: 2 },
      },
    })
  })

  it('patchMilestoneSchema accepts the full campaign brief preset-create payload', () => {
    const fields = getMilestonePresetCreateFields('restaurant_campaign_brief', (k) => k)
    const parsed = patchMilestoneSchema.safeParse({
      name: fields.name,
      presetId: 'restaurant_campaign_brief',
      milestoneData: fields.milestoneData,
      milestoneInput: fields.milestoneInput,
      goal: fields.goal,
      passCriterias: (fields.passCriteria ?? []).map((row, index) => ({
        id: `pc-${index}`,
        ...row,
      })),
    })
    expect(parsed.success).toBe(true)
  })

  it('igPlanMilestoneDataSchema parses structured slot strategy entries', () => {
    const parsed = igPlanMilestoneDataSchema.safeParse({
      scheduleExplanation: 'Push puzzle items on low-demand breakfast slots.',
      entries: [
        {
          day: 'tuesday',
          slot: '09:00',
          objective: 'Increase Tue breakfast',
          pillar: 'hero',
          mealPeriod: 'breakfast',
          productRole: 'puzzle',
          slotStrategy: 'aggressively_grow',
          slotKey: 'tuesday-breakfast',
        },
      ],
      sourceAnalyticsRunId: '42',
      reportingPeriod: '2025-01-01 to 2025-03-31',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.entries[0]?.productRole).toBe('puzzle')
    }
  })

  it('getMilestonePresetCreateFields seeds ig_profile milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('ig_profile', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'ig_profile',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      usernames: [],
      bios: [],
    })
  })

  it('patchMilestoneSchema accepts the full ig_plan preset-create payload', () => {
    const fields = getMilestonePresetCreateFields('ig_plan', (k) => k)
    const parsed = patchMilestoneSchema.safeParse({
      name: fields.name,
      presetId: 'ig_plan',
      milestoneData: fields.milestoneData,
      milestoneInput: fields.milestoneInput,
      goal: fields.goal,
      passCriterias: (fields.passCriteria ?? []).map((row, index) => ({
        id: `pc-${index}`,
        ...row,
      })),
    })
    expect(parsed.success).toBe(true)
  })

  it('getMilestonePresetCreateFields seeds ig_plan milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('ig_plan', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'ig_plan',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      scheduleExplanation: '',
      entries: [],
      sourceAnalyticsRunId: '',
      reportingPeriod: '',
    })
  })

  it('optionalNotesFromMilestoneInput reads scheduler notes', () => {
    expect(
      optionalNotesFromMilestoneInput(
        { type: 'scheduler', value: { notes: 'Mark Christmas Day' } },
        'scheduler',
      ),
    ).toBe('Mark Christmas Day')
    expect(optionalNotesFromMilestoneInput(undefined, 'scheduler')).toBe('')
  })

  it('patchMilestoneSchema accepts scheduler milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'scheduler', value: { notes: 'Mark Easter Sunday' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'scheduler',
        value: { notes: 'Mark Easter Sunday' },
      })
    }
  })

  it('getMilestonePresetCreateFields seeds scheduler milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('scheduler', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'scheduler',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      startDate: '',
      endDate: '',
      publicHolidays: [],
      slots: [],
    })
  })
})
