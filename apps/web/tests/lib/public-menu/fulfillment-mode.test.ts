import { describe, expect, it } from 'vitest'

import { resolveGuestFulfillment } from '@/lib/public-menu/fulfillment-mode'

const emptyDelivery = {
  deliveryAddress: null as string | null,
  deliveryPhone: null as string | null,
  deliveryNotes: null as string | null,
}

describe('resolveGuestFulfillment', () => {
  it('locks dine_in from table QR when dine_in allowed', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        allowDelivery: false,
        lockedTableLabel: 'T12',
        guestChoice: 'pickup',
        guestTableLabel: null,
        ...emptyDelivery,
      }),
    ).toEqual({
      ok: true,
      mode: 'dine_in',
      tableLabel: 'T12',
      ...emptyDelivery,
    })
  })

  it('uses pickup from table QR when dine_in disabled', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: true,
        allowDelivery: false,
        lockedTableLabel: 'T12',
        guestChoice: 'dine_in',
        guestTableLabel: null,
        ...emptyDelivery,
      }),
    ).toEqual({
      ok: true,
      mode: 'pickup',
      tableLabel: null,
      ...emptyDelivery,
    })
  })

  it('requires table on shared menu when dine_in only', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: false,
        allowDelivery: false,
        lockedTableLabel: null,
        guestChoice: 'dine_in',
        guestTableLabel: null,
        ...emptyDelivery,
      }),
    ).toEqual({ ok: false, reason: 'table_required' })

    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: false,
        allowDelivery: false,
        lockedTableLabel: null,
        guestChoice: 'dine_in',
        guestTableLabel: ' 3 ',
        ...emptyDelivery,
      }),
    ).toEqual({
      ok: true,
      mode: 'dine_in',
      tableLabel: '3',
      ...emptyDelivery,
    })
  })

  it('honors guest choice when both modes allowed', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        allowDelivery: false,
        lockedTableLabel: null,
        guestChoice: 'pickup',
        guestTableLabel: null,
        ...emptyDelivery,
      }),
    ).toEqual({
      ok: true,
      mode: 'pickup',
      tableLabel: null,
      ...emptyDelivery,
    })

    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        allowDelivery: false,
        lockedTableLabel: null,
        guestChoice: 'dine_in',
        guestTableLabel: 'Patio 2',
        ...emptyDelivery,
      }),
    ).toEqual({
      ok: true,
      mode: 'dine_in',
      tableLabel: 'Patio 2',
      ...emptyDelivery,
    })
  })

  it('rejects when no modes enabled', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: false,
        allowDelivery: false,
        lockedTableLabel: null,
        guestChoice: 'pickup',
        guestTableLabel: null,
        ...emptyDelivery,
      }),
    ).toEqual({ ok: false, reason: 'no_modes' })
  })

  it('resolves delivery with address and phone', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: false,
        allowDelivery: true,
        lockedTableLabel: null,
        guestChoice: 'delivery',
        guestTableLabel: null,
        deliveryAddress: '  Main St 1 ',
        deliveryPhone: ' +491234 ',
        deliveryNotes: '  ring twice ',
      }),
    ).toEqual({
      ok: true,
      mode: 'delivery',
      tableLabel: null,
      deliveryAddress: 'Main St 1',
      deliveryPhone: '+491234',
      deliveryNotes: 'ring twice',
    })
  })

  it('requires delivery address and phone', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: false,
        allowDelivery: true,
        lockedTableLabel: null,
        guestChoice: 'delivery',
        guestTableLabel: null,
        deliveryAddress: null,
        deliveryPhone: '+491234',
        deliveryNotes: null,
      }),
    ).toEqual({ ok: false, reason: 'delivery_address_required' })

    expect(
      resolveGuestFulfillment({
        allowDineIn: false,
        allowPickup: false,
        allowDelivery: true,
        lockedTableLabel: null,
        guestChoice: 'delivery',
        guestTableLabel: null,
        deliveryAddress: 'Main St 1',
        deliveryPhone: '   ',
        deliveryNotes: null,
      }),
    ).toEqual({ ok: false, reason: 'delivery_phone_required' })
  })

  it('honors delivery among multiple modes', () => {
    expect(
      resolveGuestFulfillment({
        allowDineIn: true,
        allowPickup: true,
        allowDelivery: true,
        lockedTableLabel: null,
        guestChoice: 'delivery',
        guestTableLabel: 'ignored',
        deliveryAddress: 'Home 9',
        deliveryPhone: '555',
        deliveryNotes: null,
      }),
    ).toEqual({
      ok: true,
      mode: 'delivery',
      tableLabel: null,
      deliveryAddress: 'Home 9',
      deliveryPhone: '555',
      deliveryNotes: null,
    })
  })
})
