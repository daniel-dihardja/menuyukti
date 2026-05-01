import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  optionalNotesFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

describe('milestone optional notes (promotion_candidates parity)', () => {
  it('milestonePresetHasDefaultOptionalNotesInput includes promotion_candidates', () => {
    expect(milestonePresetHasDefaultOptionalNotesInput('restaurant_brand_brief')).toBe(true)
    expect(milestonePresetHasDefaultOptionalNotesInput('promotion_candidates')).toBe(true)
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
})
