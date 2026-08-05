import { describe, expect, it } from 'vitest'

import { resolveAnalyticsRunName } from '@/lib/chat/resolve-analytics-run-name'

const FALLBACKS = {
  none: 'None',
  unavailable: 'Unavailable',
} as const

describe('resolveAnalyticsRunName', () => {
  it('returns none fallback when id is null', () => {
    expect(resolveAnalyticsRunName([{ id: 1, name: 'Q1' }], null, FALLBACKS)).toBe('None')
  })

  it('returns the matching run name', () => {
    expect(
      resolveAnalyticsRunName(
        [
          { id: 1, name: 'Q1' },
          { id: 2, name: 'Q2' },
        ],
        2,
        FALLBACKS,
      ),
    ).toBe('Q2')
  })

  it('returns unavailable when id is missing from the list', () => {
    expect(resolveAnalyticsRunName([{ id: 1, name: 'Q1' }], 99, FALLBACKS)).toBe('Unavailable')
  })

  it('returns unavailable when the matched name is blank', () => {
    expect(resolveAnalyticsRunName([{ id: 1, name: '  ' }], 1, FALLBACKS)).toBe('Unavailable')
  })
})
