import { isTerminalPrepStatus } from '@/lib/orders/prep-status'
import type { PublicMenuFulfillmentMode } from '@/lib/public-menu/fulfillment-mode'

export type PublicMenuPrepStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'PICKED_UP'
  | 'DELIVERED'

export type PublicMenuOrderTicketStatus = 'open' | 'paid' | 'void' | 'refunded' | string

export type PublicMenuActiveOrder = {
  orderId: number
  billNumber: string
  fulfillmentMode: PublicMenuFulfillmentMode
  tableLabel: string | null
  prepStatus: PublicMenuPrepStatus | null
  status: PublicMenuOrderTicketStatus
  lines: Array<{ menuItemId: number; name: string }>
  savedAt: number
}

const TERMINAL_TICKET_STATUSES = new Set(['paid', 'void', 'refunded'])

const PREP_STATUSES = new Set<PublicMenuPrepStatus>([
  'RECEIVED',
  'PREPARING',
  'READY',
  'SERVED',
  'PICKED_UP',
  'DELIVERED',
])

export function isTerminalTicketStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return TERMINAL_TICKET_STATUSES.has(status.trim().toLowerCase())
}

/** Guest “My order” is done when the ticket closes or prep reaches a terminal stage. */
export function isGuestOrderComplete(
  status: string | null | undefined,
  prepStatus: PublicMenuPrepStatus | null | undefined,
): boolean {
  return isTerminalTicketStatus(status) || isTerminalPrepStatus(prepStatus)
}

/** Normalize GraphQL enum names/values (OPEN / open) to lowercase ticket status. */
export function normalizeTicketStatus(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  return value || null
}

/** Normalize GraphQL prep enum (RECEIVED / received) to uppercase storage form. */
export function normalizePrepStatus(raw: string | null | undefined): PublicMenuPrepStatus | null {
  if (!raw || typeof raw !== 'string') return null
  const value = raw.trim().toUpperCase() as PublicMenuPrepStatus
  return PREP_STATUSES.has(value) ? value : null
}

export function normalizeFulfillmentMode(
  raw: string | null | undefined,
): PublicMenuFulfillmentMode | null {
  if (!raw || typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  if (value === 'dine_in' || value === 'dine-in') return 'dine_in'
  if (value === 'pickup') return 'pickup'
  if (value === 'delivery') return 'delivery'
  return null
}

function storageKey(locationId: number): string {
  return `public-menu-active-order:${locationId}`
}

function parseActiveOrder(raw: unknown): PublicMenuActiveOrder | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<PublicMenuActiveOrder>
  if (
    typeof value.orderId !== 'number' ||
    !Number.isInteger(value.orderId) ||
    value.orderId < 1 ||
    typeof value.billNumber !== 'string' ||
    !value.billNumber.trim() ||
    (value.fulfillmentMode !== 'dine_in' &&
      value.fulfillmentMode !== 'pickup' &&
      value.fulfillmentMode !== 'delivery') ||
    (value.tableLabel != null && typeof value.tableLabel !== 'string') ||
    typeof value.status !== 'string' ||
    typeof value.savedAt !== 'number'
  ) {
    return null
  }

  const prepStatus =
    value.prepStatus === 'RECEIVED' ||
    value.prepStatus === 'PREPARING' ||
    value.prepStatus === 'READY' ||
    value.prepStatus === 'SERVED' ||
    value.prepStatus === 'PICKED_UP' ||
    value.prepStatus === 'DELIVERED'
      ? value.prepStatus
      : null

  const lines: Array<{ menuItemId: number; name: string }> = []
  if (Array.isArray(value.lines)) {
    for (const line of value.lines) {
      if (
        !line ||
        typeof line !== 'object' ||
        typeof line.menuItemId !== 'number' ||
        typeof line.name !== 'string'
      ) {
        continue
      }
      lines.push({ menuItemId: line.menuItemId, name: line.name })
    }
  }

  return {
    orderId: value.orderId,
    billNumber: value.billNumber.trim(),
    fulfillmentMode: value.fulfillmentMode,
    tableLabel: value.tableLabel?.trim() || null,
    prepStatus,
    status: value.status.trim().toLowerCase(),
    lines,
    savedAt: value.savedAt,
  }
}

export function loadPublicMenuActiveOrder(locationId: number): PublicMenuActiveOrder | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(locationId))
    if (!raw) return null
    const parsed = parseActiveOrder(JSON.parse(raw) as unknown)
    if (!parsed) {
      localStorage.removeItem(storageKey(locationId))
      return null
    }
    if (isGuestOrderComplete(parsed.status, parsed.prepStatus)) {
      localStorage.removeItem(storageKey(locationId))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function savePublicMenuActiveOrder(
  locationId: number,
  order: Omit<PublicMenuActiveOrder, 'savedAt'> & { savedAt?: number },
): void {
  if (typeof window === 'undefined') return
  if (isGuestOrderComplete(order.status, order.prepStatus)) {
    clearPublicMenuActiveOrder(locationId)
    return
  }
  try {
    const payload: PublicMenuActiveOrder = {
      ...order,
      status: order.status.trim().toLowerCase(),
      savedAt: order.savedAt ?? Date.now(),
    }
    localStorage.setItem(storageKey(locationId), JSON.stringify(payload))
  } catch {
    // Quota / private mode — ignore; panel stays in memory for this session.
  }
}

export function clearPublicMenuActiveOrder(locationId: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey(locationId))
  } catch {
    // ignore
  }
}
