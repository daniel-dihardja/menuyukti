import type { PosOrder, PosPrepStatus } from '@/lib/graphql/queries/pos-orders'

export const PREP_TERMINAL: ReadonlySet<PosPrepStatus> = new Set([
  'SERVED',
  'PICKED_UP',
  'DELIVERED',
])

export type OrderBoardColumn = 'new' | 'preparing' | 'ready' | 'done'

export function isDigitalMenuOrder(order: Pick<PosOrder, 'note' | 'fulfillmentMode'>): boolean {
  return order.note === 'digital_menu' || order.fulfillmentMode != null
}

export function isTerminalPrepStatus(status: PosPrepStatus | null | undefined): boolean {
  return status != null && PREP_TERMINAL.has(status)
}

export function nextPrepStatus(
  current: PosPrepStatus | null,
  fulfillmentMode: PosOrder['fulfillmentMode'],
): PosPrepStatus | null {
  if (!current || PREP_TERMINAL.has(current)) return null
  if (current === 'RECEIVED') return 'PREPARING'
  if (current === 'PREPARING') return 'READY'
  if (current === 'READY') {
    if (fulfillmentMode === 'PICKUP') return 'PICKED_UP'
    if (fulfillmentMode === 'DELIVERY') return 'DELIVERED'
    return 'SERVED'
  }
  return null
}

export function boardColumnForPrep(status: PosPrepStatus | null): OrderBoardColumn | null {
  if (!status) return null
  if (status === 'RECEIVED') return 'new'
  if (status === 'PREPARING') return 'preparing'
  if (status === 'READY') return 'ready'
  if (PREP_TERMINAL.has(status)) return 'done'
  return null
}

/** Compact age label for counter boards (e.g. "2m", "1h"). */
export function formatOrderAge(openedAt: string, nowMs = Date.now()): string {
  const opened = Date.parse(openedAt)
  if (!Number.isFinite(opened)) return ''
  const minutes = Math.max(0, Math.floor((nowMs - opened) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
