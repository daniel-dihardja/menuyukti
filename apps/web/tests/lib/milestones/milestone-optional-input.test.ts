import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  optionalNotesFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

describe('milestone optional notes (promotion_candidates parity)', () => {
  it('milestonePresetHasDefaultOptionalNotesInput includes promotion_candidates and post_scheduler', () => {
    expect(milestonePresetHasDefaultOptionalNotesInput('restaurant_campaign_brief')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('promotion_candidates')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('post_scheduler')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('dates')).toBe(false)
    expect(milestonePresetHasDefaultOptionalNotesInput(undefined)).toBe(false)
  })

  it('optionalNotesFromMilestoneInput reads notes for promotion_candidates', () => {
    expect(
      optionalNotesFromMilestoneInput(
        { type: 'promotion_candidates', value: { notes: '  brunch  ' } },
        'promotion_candidates',
      ),
    ).toBe('  brunch  ')
  })

  it('patchMilestoneSchema accepts promotion_candidates milestoneInput', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: { type: 'promotion_candidates', value: { notes: 'stress desserts' } },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'promotion_candidates',
        value: { notes: 'stress desserts' },
      })
    }
  })

  it('getMilestonePresetCreateFields seeds promotion_candidates milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('promotion_candidates', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'promotion_candidates',
      value: { notes: '' },
    })
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

  it('getMilestonePresetCreateFields seeds post_scheduler milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('post_scheduler', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'post_scheduler',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({ posts: [] })
    expect(fields.milestoneRunSkillIds).toEqual(['post_scheduler'])
  })
})
