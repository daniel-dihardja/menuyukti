import { describe, expect, it } from 'vitest'

import { buildUserContentWithReferencedSources } from '@/lib/chat/build-user-content-with-referenced-sources'

describe('buildUserContentWithReferencedSources', () => {
  it('joins multiple sections before user text', () => {
    const out = buildUserContentWithReferencedSources({
      userText: '@Campaign Brief @Pair lift matrix compare slots',
      sections: [
        '## Preset data — Campaign Brief\n- **Cta:** Book',
        '## Visualization data — Pair lift matrix\n| A | B |',
      ],
    })
    expect(out).toContain('## Preset data — Campaign Brief')
    expect(out).toContain('## Visualization data — Pair lift matrix')
    expect(out.endsWith('@Campaign Brief @Pair lift matrix compare slots')).toBe(true)
  })

  it('returns trimmed user text when no sections', () => {
    expect(
      buildUserContentWithReferencedSources({
        userText: '  hello  ',
        sections: [],
      }),
    ).toBe('hello')
  })
})
