import { describe, expect, it } from 'vitest'

import {
  scheduleExplanationPreviewSnippet,
  scheduleExplanationUsesDisclosure,
  shouldShowScheduleExplanation,
} from '@/lib/milestones/scheduler-schedule-explanation'

describe('scheduler schedule explanation display', () => {
  it('hides very short explanations', () => {
    expect(shouldShowScheduleExplanation('Too brief.')).toBe(false)
    expect(shouldShowScheduleExplanation('x'.repeat(79))).toBe(false)
    expect(shouldShowScheduleExplanation('x'.repeat(80))).toBe(true)
  })

  it('uses disclosure only for longer copy', () => {
    const medium =
      'Monthly pin on June 2 avoids the holiday and anchors the block. Weekday lunch cadence supports discovery.'
    expect(scheduleExplanationUsesDisclosure(medium)).toBe(false)

    const long = `${medium} ${'More detail about cadence and audience. '.repeat(6)}`
    expect(scheduleExplanationUsesDisclosure(long)).toBe(true)
    expect(scheduleExplanationPreviewSnippet(long)).toMatch(/…$/)
  })
})
