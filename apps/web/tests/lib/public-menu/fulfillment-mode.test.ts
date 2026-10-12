import { describe, expect, it } from 'vitest'

import { resolveGuestFulfillment } from '@/lib/public-menu/fulfillment-mode'

describe('resolveGuestFulfillment', () => {
  it('locks dine_in from table QR when dine_in allowed', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        lockedTableLabel: 'T12',
        guestChoice: 'pickup',
        guestTableLabel: null,
      }),
    ).toEqual({ ok: true, mode: 'dine_in', tableLabel: 'T12' })
  })

  it('uses pickup from table QR when dine_in disabled', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: true,
        lockedTableLabel: 'T12',
        guestChoice: 'dine_in',
        guestTableLabel: null,
      }),
    ).toEqual({ ok: true, mode: 'pickup', tableLabel: null })
  })

  it('requires table on shared menu when dine_in only', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: false,
        lockedTableLabel: null,
        guestChoice: 'dine_in',
        guestTableLabel: null,
      }),
    ).toEqual({ ok: false, reason: 'table_required' })

    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: false,
        lockedTableLabel: null,
        guestChoice: 'dine_in',
        guestTableLabel: ' 3 ',
      }),
    ).toEqual({ ok: true, mode: 'dine_in', tableLabel: '3' })
  })

  it('honors guest choice when both modes allowed', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        lockedTableLabel: null,
        guestChoice: 'pickup',
        guestTableLabel: null,
      }),
    ).toEqual({ ok: true, mode: 'pickup', tableLabel: null })

    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        lockedTableLabel: null,
        guestChoice: 'dine_in',
        guestTableLabel: 'Patio 2',
      }),
    ).toEqual({ ok: true, mode: 'dine_in', tableLabel: 'Patio 2' })
  })

  it('rejects when no modes enabled', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: false,
        lockedTableLabel: null,
        guestChoice: 'pickup',
        guestTableLabel: null,
      }),
    ).toEqual({ ok: false, reason: 'no_modes' })
  })
})
