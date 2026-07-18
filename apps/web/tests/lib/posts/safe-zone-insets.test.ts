import { describe, expect, it } from 'vitest'

import {
  clampSafeZoneInsetPx,
  DEFAULT_SAFE_ZONE_INSET_X_PX,
  DEFAULT_SAFE_ZONE_INSET_Y_PX,
  maxSafeZoneInsetPx,
  safeZoneInsetPercents,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'

describe('safeZoneInsetPercents', () => {
  it('converts default insets relative to output dimensions', () => {
    const width = 928
    const height = 1152
    const result = safeZoneInsetPercents(
      DEFAULT_SAFE_ZONE_INSET_X_PX,
      DEFAULT_SAFE_ZONE_INSET_Y_PX,
      width,
      height,
    )

    expect(DEFAULT_SAFE_ZONE_INSET_X_PX).toBe(100)
    expect(DEFAULT_SAFE_ZONE_INSET_Y_PX).toBe(100)
    expect(result.insetXPercent).toBeCloseTo((100 / width) * 100)
    expect(result.insetYPercent).toBeCloseTo((100 / height) * 100)
  })

  it('clamps insets so margins cannot meet in the middle', () => {
    const result = safeZoneInsetPercents(10_000, 10_000, 100, 200)
    const maxX = maxSafeZoneInsetPx(100)
    const maxY = maxSafeZoneInsetPx(200)

    expect(maxX).toBe(49)
    expect(maxY).toBe(99)
    expect(result.insetXPercent).toBeCloseTo((maxX / 100) * 100)
    expect(result.insetYPercent).toBeCloseTo((maxY / 200) * 100)
  })

  it('treats non-finite and negative insets as zero', () => {
    expect(clampSafeZoneInsetPx(Number.NaN, 100)).toBe(0)
    expect(clampSafeZoneInsetPx(-5, 100)).toBe(0)
    expect(safeZoneInsetPercents(-1, Number.NaN, 100, 100)).toEqual({
      insetXPercent: 0,
      insetYPercent: 0,
    })
  })
})
