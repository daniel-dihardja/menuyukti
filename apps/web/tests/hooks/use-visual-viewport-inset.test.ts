import { describe, expect, it } from 'vitest'

import { computeVisualViewportBottomInset } from '@/hooks/use-visual-viewport-inset'

describe('computeVisualViewportBottomInset', () => {
  it('returns 0 when visual viewport fills the layout viewport', () => {
    expect(
      computeVisualViewportBottomInset({
        innerHeight: 800,
        visualViewportHeight: 800,
        visualViewportOffsetTop: 0,
      }),
    ).toBe(0)
  })

  it('returns keyboard occlusion height', () => {
    expect(
      computeVisualViewportBottomInset({
        innerHeight: 800,
        visualViewportHeight: 500,
        visualViewportOffsetTop: 0,
      }),
    ).toBe(300)
  })

  it('accounts for visual viewport offsetTop (iOS scroll)', () => {
    expect(
      computeVisualViewportBottomInset({
        innerHeight: 800,
        visualViewportHeight: 500,
        visualViewportOffsetTop: 40,
      }),
    ).toBe(260)
  })

  it('never returns a negative inset', () => {
    expect(
      computeVisualViewportBottomInset({
        innerHeight: 500,
        visualViewportHeight: 800,
        visualViewportOffsetTop: 0,
      }),
    ).toBe(0)
  })
})
