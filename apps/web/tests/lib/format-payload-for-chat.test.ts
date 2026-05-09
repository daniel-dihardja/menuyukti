import { describe, expect, it } from 'vitest'

import {
  formatPayloadForChat,
  formatPresetDataMarkdownSection,
} from '@/lib/chat/format-payload-for-chat'

describe('formatPayloadForChat', () => {
  it('formats empty object', () => {
    expect(formatPayloadForChat({})).toBe('')
  })

  it('formats nested dict with list', () => {
    const out = formatPayloadForChat({
      venueSnapshot: { venueName: 'Cafe', city: 'Oslo', country: 'NO', currency: 'NOK' },
      contentPillars: [],
    })
    expect(out).toContain('**Venue Snapshot:**')
    expect(out).toContain('**Venue Name:** Cafe')
    expect(out).toContain('**Content Pillars:** —')
  })
})

describe('formatPresetDataMarkdownSection', () => {
  it('adds heading and not set line', () => {
    const out = formatPresetDataMarkdownSection('Brief', null)
    expect(out).toContain('## Preset data — Brief')
    expect(out).toContain('(not set)')
  })
})
