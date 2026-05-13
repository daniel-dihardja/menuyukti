export type MenuTaggerItemLike = {
  role: 'star' | 'puzzle'
  category: string
}

export type MenuTaggerCategoryBucket<T extends MenuTaggerItemLike> = {
  star: T[]
  puzzle: T[]
}

/** Group items by category, preserving first-seen category order from the source list. */
export function groupMenuTaggerItemsByCategory<T extends MenuTaggerItemLike>(
  items: T[],
  uncategorizedLabel: string,
): Array<[string, MenuTaggerCategoryBucket<T>]> {
  const byCategory = new Map<string, MenuTaggerCategoryBucket<T>>()
  const categoryOrder: string[] = []

  for (const item of items) {
    const key = item.category.trim() || uncategorizedLabel
    if (!byCategory.has(key)) {
      byCategory.set(key, { star: [], puzzle: [] })
      categoryOrder.push(key)
    }
    const bucket = byCategory.get(key)!
    if (item.role === 'star') {
      bucket.star.push(item)
    } else {
      bucket.puzzle.push(item)
    }
  }

  return categoryOrder.map((category) => [category, byCategory.get(category)!])
}
