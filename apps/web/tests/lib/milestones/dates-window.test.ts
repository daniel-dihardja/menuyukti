import { describe, expect, it } from 'vitest'

import { campaignWeeks, countCampaignWeeks } from '@/lib/milestones/dates-window'

describe('dates-window', () => {
  it('counts campaign weeks for June 2026 window', () => {
    const start = '2026-06-01'
    const end = '2026-06-30'
    expect(countCampaignWeeks(start, end)).toBe(4)
    expect(campaignWeeks(start, end)).toHaveLength(4)
    expect(campaignWeeks(start, end)[0]?.postDate).toBe('2026-06-04')
  })
})
