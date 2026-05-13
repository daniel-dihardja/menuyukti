/** Sentinel stored in milestoneInput / API when POS rows lack menu_category. */
export const UNCATEGORIZED_MENU_CATEGORY_KEY = '__uncategorized__'

export type MenuCategorySummary = {
  name: string
  itemCount: number
}

type CatalogItem = {
  category: string
}

export function aggregateMenuCategoriesFromCatalogItems(
  items: CatalogItem[],
): MenuCategorySummary[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const raw = item.category?.trim() ?? ''
    const key = raw.length > 0 ? raw : UNCATEGORIZED_MENU_CATEGORY_KEY
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, itemCount]) => ({ name, itemCount }))
    .sort((a, b) => {
      if (a.name === UNCATEGORIZED_MENU_CATEGORY_KEY) return 1
      if (b.name === UNCATEGORIZED_MENU_CATEGORY_KEY) return -1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
}
