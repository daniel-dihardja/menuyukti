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

  it('getMilestonePresetCreateFields seeds post_scheduler milestoneInput', () => {
    const fields = getMilestonePresetCreateFields('post_scheduler', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'post_scheduler',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({ posts: [] })
  })
})
