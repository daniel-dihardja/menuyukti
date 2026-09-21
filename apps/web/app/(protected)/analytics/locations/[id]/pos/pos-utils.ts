import type {
  LocationMenuItem,
  LocationMenuModifierGroup,
} from '@/lib/graphql/queries/location-menu'
import type { PosOrderStatus } from '@/lib/graphql/queries/pos-orders'

export type TodayFilter = 'all' | PosOrderStatus
export type DiscountMode = 'amount' | 'percent'

export const TODAY_FILTERS: TodayFilter[] = ['all', 'OPEN', 'PAID', 'VOID', 'REFUNDED']

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
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
