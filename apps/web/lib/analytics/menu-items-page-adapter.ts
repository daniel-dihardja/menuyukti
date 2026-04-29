import type { PromotionMenuItemsData } from '@/lib/graphql/queries'

type PromotionMenuItem = NonNullable<PromotionMenuItemsData['promotionMenuItems']>['items'][number]

export type MenuItemsDisplayRow = {
  menuItem: string
  category: string
  subCategory: string
  quantity: number
  totalRevenue: number
}

function toDisplayRow(item: PromotionMenuItem): MenuItemsDisplayRow {
  return {
    menuItem: item.menu?.trim() || 'Unknown',
    category: item.menuCategory?.trim() || 'Uncategorized',
    subCategory: item.menuCategoryDetail?.trim() || '—',
    quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
    totalRevenue: Number.isFinite(Number(item.totalRevenue)) ? Number(item.totalRevenue) : 0,
  }
}

/**
 * Map promotion items (order-fact derived) into display rows and order them so
 * equal menu names stay together in one table.
 */
export function promotionItemsToTableRows(
  items: PromotionMenuItem[] | null | undefined,
  locale: string,
): MenuItemsDisplayRow[] {
  if (!items || !Array.isArray(items)) return []
  return items.map(toDisplayRow).sort((a, b) => {
    const byMenu = a.menuItem.localeCompare(b.menuItem, locale)
    if (byMenu !== 0) return byMenu
    const byQty = b.quantity - a.quantity
    if (byQty !== 0) return byQty
    return a.subCategory.localeCompare(b.subCategory, locale)
  })
}
