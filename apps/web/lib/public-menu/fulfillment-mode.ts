import { parsePublicMenuTableLabel } from '@/lib/public-menu/table-label'

/** Includes `delivery` for historical tickets; new guest orders are dine_in or pickup only. */
export type PublicMenuFulfillmentMode = 'dine_in' | 'pickup' | 'delivery'

export type GuestFulfillmentChoice = 'dine_in' | 'pickup'

export type ResolveGuestFulfillmentInput = {
  allowDineIn: boolean
  allowPickup: boolean
  /** Table from `/{slug}/menu/t/{table}` when present. */
  lockedTableLabel: string | null
  /** Guest choice when multiple modes allowed and no locked table. */
  guestChoice: GuestFulfillmentChoice
  /** Guest-entered table when ordering dine-in from the shared menu. */
  guestTableLabel: string | null
}

export type ResolveGuestFulfillmentOk = {
  ok: true
  mode: GuestFulfillmentChoice
  tableLabel: string | null
}

export type ResolveGuestFulfillmentResult =
  | ResolveGuestFulfillmentOk
  | {
      ok: false
      reason: 'no_modes' | 'table_required'
    }

function resolveDineIn(tableLabel: string | null): ResolveGuestFulfillmentResult {
  if (!tableLabel) return { ok: false, reason: 'table_required' }
  return {
    ok: true,
    mode: 'dine_in',
    tableLabel,
  }
}

function resolvePickup(): ResolveGuestFulfillmentOk {
  return {
    ok: true,
    mode: 'pickup',
    tableLabel: null,
  }
}

function defaultMode(input: ResolveGuestFulfillmentInput): GuestFulfillmentChoice | null {
  const { guestChoice, allowDineIn, allowPickup } = input
  if (guestChoice === 'dine_in' && allowDineIn) return 'dine_in'
  if (guestChoice === 'pickup' && allowPickup) return 'pickup'
  if (allowPickup) return 'pickup'
  if (allowDineIn) return 'dine_in'
  return null
}

/**
 * Resolve digital-menu fulfillment from location settings + entry URL + guest input.
 *
 * Table QR locks dine_in when allowed; otherwise falls through to pickup.
 * Shared menu uses guestChoice among enabled modes (dine_in / pickup only).
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
      return resolveDineIn(lockedTableLabel)
    }
    if (allowPickup) return resolvePickup()
    return { ok: false, reason: 'no_modes' }
  }

  const mode = defaultMode(input)
  if (!mode) return { ok: false, reason: 'no_modes' }

  if (mode === 'pickup') return resolvePickup()
  return resolveDineIn(parsePublicMenuTableLabel(input.guestTableLabel))
}
