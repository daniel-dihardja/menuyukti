import { describe, expect, it } from 'vitest'

import { buildUserContentWithReferencedPreset } from '@/lib/chat/build-user-content-with-referenced-preset'

describe('buildUserContentWithReferencedPreset', () => {
  it('prepends preset markdown and preserves user text', () => {
    const out = buildUserContentWithReferencedPreset({
      userText: '  @Campaign brief what is the CTA?  ',
      milestoneTitle: 'Campaign brief',
      presetPayload: { offerAndCtaPlan: { primaryCta: 'Book now' } },
    })
    expect(out).toContain('## Preset data — Campaign brief')
    expect(out).toContain('**Offer And Cta Plan:**')
    expect(out).toContain('@Campaign brief what is the CTA?')
  })

  it('handles null preset payload', () => {
    const out = buildUserContentWithReferencedPreset({
      userText: '@M sum up',
      milestoneTitle: 'M',
      presetPayload: null,
    })
    expect(out).toContain('(not set)')
    expect(out.endsWith('@M sum up')).toBe(true)
  })
})
