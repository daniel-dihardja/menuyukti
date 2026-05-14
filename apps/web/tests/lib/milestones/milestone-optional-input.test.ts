import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  normalizePromotionCandidatesInput,
  optionalNotesFromMilestoneInput,
  promotionCandidatesInputFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

describe('milestone optional notes', () => {
  it('milestonePresetHasDefaultOptionalNotesInput includes supported presets', () => {
    expect(milestonePresetHasDefaultOptionalNotesInput('restaurant_campaign_brief')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('post_scheduler')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('promotion_candidates')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput('culture_hooks')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('format_mix')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('ig_profile')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('menu_tagger')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('reel_lineup')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('dates')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput(undefined)).toBe(false)
  })

  it('optionalNotesFromMilestoneInput reads notes for post_scheduler', () => {
    expect(
      optionalNotesFromMilestoneInput(
        { type: 'post_scheduler', value: { notes: '  weekdays only  ' } },
        'post_scheduler',
      ),
    ).toBe('  weekdays only  ')
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

  it('patchMilestoneSchema accepts post_scheduler milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'post_scheduler', value: { notes: 'no weekends' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'post_scheduler',
        value: { notes: 'no weekends' },
      })
    }
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

  it('patchMilestoneSchema accepts format_mix milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'format_mix', value: { notes: 'prefer Reels' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'format_mix',
        value: { notes: 'prefer Reels' },
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

  it('getMilestonePresetCreateFields seeds post_scheduler milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('post_scheduler', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'post_scheduler',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      monthlyArc: {
        weeks: [
          { week: 1, objective: '', rationale: '' },
          { week: 2, objective: '', rationale: '' },
          { week: 3, objective: '', rationale: '' },
          { week: 4, objective: '', rationale: '' },
        ],
      },
      contentRatio: { pillars: [] },
      formatMix: { formats: [] },
      weeklySlotPlan: [],
      guardrailCheck: '',
    })
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

  it('getMilestonePresetCreateFields seeds format_mix milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('format_mix', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'format_mix',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      formats: [],
    })
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
})
