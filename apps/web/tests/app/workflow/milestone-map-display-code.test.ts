import { describe, expect, it } from 'vitest'

import { milestoneNodeToTimelineMilestone } from '@/app/(protected)/workflow/_components/milestone-map'

describe('milestoneNodeToTimelineMilestone displayCode', () => {
  it('maps valid node.data.displayCode onto TimelineMilestone', () => {
    const mapped = milestoneNodeToTimelineMilestone({
      id: '42',
      name: 'Campaign brief',
      data: { displayCode: 'M-A3F2', presetId: 'restaurant_campaign_brief' },
      passCriterias: [],
    })
    expect(mapped.displayCode).toBe('M-A3F2')
  })

  it('omits invalid displayCode', () => {
    const mapped = milestoneNodeToTimelineMilestone({
      id: '42',
      name: 'Campaign brief',
      data: { displayCode: 'BAD', presetId: 'restaurant_campaign_brief' },
      passCriterias: [],
    })
    expect(mapped.displayCode).toBeUndefined()
  })
})
