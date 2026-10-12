import { parsePublicMenuTableLabel } from '@/lib/public-menu/table-label'

export type PublicMenuFulfillmentMode = 'dine_in' | 'pickup'

export type ResolveGuestFulfillmentInput = {
  allowDineIn: boolean
  allowPickup: boolean
  /** Table from `/{slug}/menu/t/{table}` when present. */
  lockedTableLabel: string | null
  /** Guest choice when both modes allowed and no locked table. */
  guestChoice: PublicMenuFulfillmentMode
  /** Guest-entered table when ordering dine-in from the shared menu. */
  guestTableLabel: string | null
}

export type ResolveGuestFulfillmentResult =
  | { ok: true; mode: PublicMenuFulfillmentMode; tableLabel: string | null }
  | { ok: false; reason: 'no_modes' | 'table_required' }

/**
 * Resolve digital-menu fulfillment from location settings + entry URL + guest input.
 *
 * | Settings     | Table QR              | Shared menu                          |
 * |--------------|-----------------------|--------------------------------------|
 * | Both         | Lock dine_in + table  | guestChoice; dine_in needs table     |
 * | Pickup only  | pickup (ignore table) | pickup                               |
 * | Dine-in only | Lock dine_in + table  | dine_in + required table input       |
 */
export function resolveGuestFulfillment(
  input: ResolveGuestFulfillmentInput,
): ResolveGuestFulfillmentResult {
  const { allowDineIn, allowPickup, lockedTableLabel } = input
  if (!allowDineIn && !allowPickup) {
    return { ok: false, reason: 'no_modes' }
  }

  if (lockedTableLabel) {
    if (allowDineIn) {
      return { ok: true, mode: 'dine_in', tableLabel: lockedTableLabel }
    }
    return { ok: true, mode: 'pickup', tableLabel: null }
  }

  if (allowDineIn && !allowPickup) {
    const table = parsePublicMenuTableLabel(input.guestTableLabel)
    if (!table) return { ok: false, reason: 'table_required' }
    return { ok: true, mode: 'dine_in', tableLabel: table }
  }

  if (!allowDineIn && allowPickup) {
    return { ok: true, mode: 'pickup', tableLabel: null }
  }

  // Both allowed on shared menu
  const mode = input.guestChoice === 'dine_in' ? 'dine_in' : 'pickup'
  if (mode === 'pickup') {
    return { ok: true, mode: 'pickup', tableLabel: null }
  }
  const table = parsePublicMenuTableLabel(input.guestTableLabel)
  if (!table) return { ok: false, reason: 'table_required' }
  return { ok: true, mode: 'dine_in', tableLabel: table }
}
