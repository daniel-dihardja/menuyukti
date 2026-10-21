import type {
  LocationMenuItem,
  LocationMenuModifierGroup,
} from '@/lib/graphql/queries/location-menu'
import type { PosOrder, PosOrderStatus, PosPrepStatus } from '@/lib/graphql/queries/pos-orders'

export type TodayFilter = 'all' | PosOrderStatus
export type DiscountMode = 'amount' | 'percent'

export const TODAY_FILTERS: TodayFilter[] = ['all', 'OPEN', 'PAID', 'VOID', 'REFUNDED']

const SHOW_ITEM_IMAGES_STORAGE_KEY = 'menuyukti:posShowItemImages:v1'

export function readPosShowItemImages(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(SHOW_ITEM_IMAGES_STORAGE_KEY)
    if (value === '0') return false
    if (value === '1') return true
  } catch {
    /* ignore quota / private mode */
  }
  return null
}

export function writePosShowItemImages(show: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHOW_ITEM_IMAGES_STORAGE_KEY, show ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Pre-discount line amount. GraphQL `lineTotal` maps to post-discount `gross_cents`
 * after bill discount allocation — do not sum those for subtotal.
 */
export function linePreDiscountTotal(line: { unitPrice: number; qty: number }): number {
  return roundMoney(line.unitPrice * line.qty)
}

/** Sum of unit×qty before bill discount (matches backend allocate_discount_and_tax). */
export function orderPreDiscountSubtotal(
  lines: ReadonlyArray<{ unitPrice: number; qty: number }>,
): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0))
}

/** Payable total after bill discount; prefer server `gross` when present. */
export function orderPayableTotal(order: {
  lines: ReadonlyArray<{ unitPrice: number; qty: number }>
  discountAmount?: number | null
  gross?: number | null
}): number {
  if (order.gross != null && Number.isFinite(order.gross)) {
    return order.gross
  }
  const discount = order.discountAmount ?? 0
  return Math.max(0, roundMoney(orderPreDiscountSubtotal(order.lines) - discount))
}

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function truncateClerkId(id: string, max = 8): string {
  if (id.length <= max) return id
  return `${id.slice(0, max)}…`
}

export function availableModifierGroups(item: LocationMenuItem): LocationMenuModifierGroup[] {
  return (item.modifierGroups ?? [])
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => option.isAvailable),
    }))
    .filter((group) => group.options.length > 0)
}

export function statusBadgeVariant(
  status: PosOrderStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'OPEN':
      return 'secondary'
    case 'PAID':
      return 'default'
    case 'VOID':
      return 'outline'
    case 'REFUNDED':
      return 'destructive'
    default:
      return 'outline'
  }
}

const PREP_TERMINAL: ReadonlySet<PosPrepStatus> = new Set(['SERVED', 'PICKED_UP', 'DELIVERED'])

export function isDigitalMenuOrder(order: Pick<PosOrder, 'note' | 'fulfillmentMode'>): boolean {
  return order.note === 'digital_menu' || order.fulfillmentMode != null
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
