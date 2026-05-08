import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  optionalNotesFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

describe('milestone optional notes', () => {
  it('milestonePresetHasDefaultOptionalNotesInput includes supported presets', () => {
    expect(milestonePresetHasDefaultOptionalNotesInput('restaurant_campaign_brief')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('post_scheduler')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('promotion_candidates')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('culture_hooks')).toBe(true)
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

  it('patchMilestoneSchema accepts goal-only patch', () => {
    const parsed = patchMilestoneSchema.safeParse({ goal: 'Increase repeat visits' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.goal).toBe('Increase repeat visits')
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
})
