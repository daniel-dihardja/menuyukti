import { describe, expect, it } from 'vitest'

import {
  confidenceTierVariant,
  formatChangePercent,
  formatPeakHour,
  formatSharePercent,
  objectiveMessageKey,
  primaryCtaMessageKey,
} from '@/lib/analytics/campaign-signals-page-adapter'

describe('campaign-signals-page-adapter', () => {
  it('maps objective and CTA values to message keys', () => {
    expect(objectiveMessageKey('conversion')).toBe('objectives.conversion')
    expect(objectiveMessageKey('other')).toBe('objectives.unknown')
    expect(primaryCtaMessageKey('dm')).toBe('cta.dm')
    expect(primaryCtaMessageKey('other')).toBe('cta.unknown')
  })

  it('formats peak hour in 24h locale style', () => {
    expect(formatPeakHour(14, 'en-GB')).toMatch(/14/)
    expect(formatPeakHour(null, 'en-GB')).toBeNull()
  })

  it('formats share and change percents', () => {
    expect(formatSharePercent(0.25, 'en-US')).toBe('25%')
    expect(formatChangePercent(0.12, 'en-US')).toBe('+12%')
    expect(formatChangePercent(null, 'en-US')).toBeNull()
  })

  it('maps confidence tier to badge variants', () => {
    expect(confidenceTierVariant('high')).toBe('default')
    expect(confidenceTierVariant('medium')).toBe('secondary')
    expect(confidenceTierVariant('low')).toBe('outline')
  })
})
