export type PromotionCandidateCategoryBlock = {
  category: string
}

export type MenuCategoryNameBlock = {
  name: string
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
