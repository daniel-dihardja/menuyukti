export type PromotionCandidateCategoryBlock = {
  category: string
}

export type MenuCategoryNameBlock = {
  name: string
}

export type PromotionCandidateItemWithPopularity = {
  name: string
  popularity?: number
}

/** Higher popularity first; items without a score follow, then name ascending. */
export function sortPromotionCandidateItemsByPopularity<
  T extends PromotionCandidateItemWithPopularity,
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aPop = typeof a.popularity === 'number' ? a.popularity : -1
    const bPop = typeof b.popularity === 'number' ? b.popularity : -1
    if (bPop !== aPop) return bPop - aPop
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

function categoryMatchesMainFocus(category: string, mainCategory: string): boolean {
  const focus = mainCategory.trim()
  if (!focus) return false
  return category.trim().toLocaleLowerCase() === focus.toLocaleLowerCase()
}

function sortByMainCategoryFirst<T>(
  items: T[],
  mainCategory: string,
  getCategoryName: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const aPrimary = categoryMatchesMainFocus(getCategoryName(a), mainCategory) ? 0 : 1
    const bPrimary = categoryMatchesMainFocus(getCategoryName(b), mainCategory) ? 0 : 1
    if (aPrimary !== bPrimary) return aPrimary - bPrimary
    return getCategoryName(a).localeCompare(getCategoryName(b), undefined, { sensitivity: 'base' })
  })
}

/** POS main category from campaign brief first; remaining blocks alphabetical. */
export function sortPromotionCandidateCategories<T extends PromotionCandidateCategoryBlock>(
  categories: T[],
  mainCategory: string,
): T[] {
  return sortByMainCategoryFirst(categories, mainCategory, (row) => row.category)
}

/** Menu category picker rows: main POS category first, then alphabetical. */
export function sortMenuCategorySummaries<T extends MenuCategoryNameBlock>(
  categories: T[],
  mainCategory: string,
): T[] {
  return sortByMainCategoryFirst(categories, mainCategory, (row) => row.name)
}
