import { describe, expect, it } from 'vitest'

import { formatIdr } from '../lib/formatCurrency'

describe('formatIdr', () => {
  it('formats zero with space and rupiah suffix', () => {
    expect(formatIdr(0)).toBe('Rp 0,-')
  })

  it('groups thousands with Indonesian separators', () => {
    expect(formatIdr(100_000)).toBe('Rp 100.000,-')
  })

  it('keeps a leading minus for negative amounts', () => {
    expect(formatIdr(-1500)).toBe('-Rp 1.500,-')
  })
})
