import { parsePublicMenuTableLabel } from '@/lib/public-menu/table-label'

export type PublicMenuFulfillmentMode = 'dine_in' | 'pickup' | 'delivery'

export const DELIVERY_ADDRESS_MAX_LEN = 512
export const DELIVERY_PHONE_MAX_LEN = 32
export const DELIVERY_NOTES_MAX_LEN = 256

export type ResolveGuestFulfillmentInput = {
  allowDineIn: boolean
  allowPickup: boolean
  allowDelivery: boolean
  /** Table from `/{slug}/menu/t/{table}` when present. */
  lockedTableLabel: string | null
  /** Guest choice when multiple modes allowed and no locked table. */
  guestChoice: PublicMenuFulfillmentMode
  /** Guest-entered table when ordering dine-in from the shared menu. */
  guestTableLabel: string | null
  deliveryAddress: string | null
  deliveryPhone: string | null
  deliveryNotes: string | null
}

export type ResolveGuestFulfillmentOk = {
  ok: true
  mode: PublicMenuFulfillmentMode
  tableLabel: string | null
  deliveryAddress: string | null
  deliveryPhone: string | null
  deliveryNotes: string | null
}

export type ResolveGuestFulfillmentResult =
  | ResolveGuestFulfillmentOk
  | {
      ok: false
      reason:
        | 'no_modes'
        | 'table_required'
        | 'delivery_address_required'
        | 'delivery_phone_required'
    }

function trimOrNull(value: string | null | undefined, maxLen: number): string | null {
  if (value == null) return null
  const cleaned = value.trim()
  if (!cleaned) return null
  return cleaned.slice(0, maxLen)
}

function resolveDeliveryFields(input: ResolveGuestFulfillmentInput): ResolveGuestFulfillmentResult {
  const address = trimOrNull(input.deliveryAddress, DELIVERY_ADDRESS_MAX_LEN)
  if (!address) return { ok: false, reason: 'delivery_address_required' }
  const phone = trimOrNull(input.deliveryPhone, DELIVERY_PHONE_MAX_LEN)
  if (!phone) return { ok: false, reason: 'delivery_phone_required' }
  return {
    ok: true,
    mode: 'delivery',
    tableLabel: null,
    deliveryAddress: address,
    deliveryPhone: phone,
    deliveryNotes: trimOrNull(input.deliveryNotes, DELIVERY_NOTES_MAX_LEN),
  }
}

function resolveDineIn(tableLabel: string | null): ResolveGuestFulfillmentResult {
  if (!tableLabel) return { ok: false, reason: 'table_required' }
  return {
    ok: true,
    mode: 'dine_in',
    tableLabel,
    deliveryAddress: null,
    deliveryPhone: null,
    deliveryNotes: null,
  }
}

function resolvePickup(): ResolveGuestFulfillmentOk {
  return {
    ok: true,
    mode: 'pickup',
    tableLabel: null,
    deliveryAddress: null,
    deliveryPhone: null,
    deliveryNotes: null,
  }
}

function defaultMode(input: ResolveGuestFulfillmentInput): PublicMenuFulfillmentMode | null {
  const { guestChoice, allowDineIn, allowPickup, allowDelivery } = input
  if (guestChoice === 'dine_in' && allowDineIn) return 'dine_in'
  if (guestChoice === 'pickup' && allowPickup) return 'pickup'
  if (guestChoice === 'delivery' && allowDelivery) return 'delivery'
  if (allowPickup) return 'pickup'
  if (allowDineIn) return 'dine_in'
  if (allowDelivery) return 'delivery'
  return null
}

/**
 * Resolve digital-menu fulfillment from location settings + entry URL + guest input.
 *
 * Table QR locks dine_in when allowed; otherwise falls through to pickup/delivery.
 * Shared menu uses guestChoice among enabled modes.
 */
export function resolveGuestFulfillment(
  input: ResolveGuestFulfillmentInput,
): ResolveGuestFulfillmentResult {
  const { allowDineIn, allowPickup, allowDelivery, lockedTableLabel } = input
  if (!allowDineIn && !allowPickup && !allowDelivery) {
    return { ok: false, reason: 'no_modes' }
  }

  if (lockedTableLabel) {
    if (allowDineIn) {
      return resolveDineIn(lockedTableLabel)
    }
    if (allowPickup) return resolvePickup()
    if (allowDelivery) return resolveDeliveryFields(input)
    return { ok: false, reason: 'no_modes' }
  }

  const mode = defaultMode(input)
  if (!mode) return { ok: false, reason: 'no_modes' }

  if (mode === 'pickup') return resolvePickup()
  if (mode === 'delivery') return resolveDeliveryFields(input)
  return resolveDineIn(parsePublicMenuTableLabel(input.guestTableLabel))
}
