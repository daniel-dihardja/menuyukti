import { describe, expect, it } from 'vitest'

import {
  boardColumnForPrep,
  formatOrderAge,
  isTerminalPrepStatus,
  nextPrepStatus,
} from '@/lib/orders/prep-status'

describe('orders prep-status helpers', () => {
  it('advances prep through pickup terminal', () => {
    expect(nextPrepStatus('RECEIVED', 'PICKUP')).toBe('PREPARING')
    expect(nextPrepStatus('PREPARING', 'PICKUP')).toBe('READY')
    expect(nextPrepStatus('READY', 'PICKUP')).toBe('PICKED_UP')
    expect(nextPrepStatus('PICKED_UP', 'PICKUP')).toBeNull()
  })

  it('maps board columns', () => {
    expect(boardColumnForPrep('RECEIVED')).toBe('new')
    expect(boardColumnForPrep('PREPARING')).toBe('preparing')
    expect(boardColumnForPrep('READY')).toBe('ready')
    expect(boardColumnForPrep('SERVED')).toBe('done')
    expect(isTerminalPrepStatus('DELIVERED')).toBe(true)
  })

  it('formats order age', () => {
    const now = Date.parse('2026-10-26T12:00:00.000Z')
    expect(formatOrderAge('2026-10-26T11:55:00.000Z', now)).toBe('5m')
    expect(formatOrderAge('2026-10-26T10:00:00.000Z', now)).toBe('2h')
  })
})
