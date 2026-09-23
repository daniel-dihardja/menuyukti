import { describe, expect, it } from 'vitest'

import { relevantHolidayIds } from '@/lib/playbooks/relevant-holiday-ids'

describe('relevantHolidayIds', () => {
  it('selects relevant ids and skips confirmed', () => {
    const scored = [
      { id: 'a', relevant: true },
      { id: 'b', relevant: false },
      { id: 'c', relevant: true },
    ]
    const confirmed = new Set(['c'])
    expect([...relevantHolidayIds(scored, confirmed)].toSorted()).toEqual(['a'])
  })

  it('returns empty set when none relevant', () => {
    const scored = [
      { id: 'a', relevant: false },
      { id: 'b', relevant: false },
    ]
    expect(relevantHolidayIds(scored, new Set())).toEqual(new Set())
  })
})
