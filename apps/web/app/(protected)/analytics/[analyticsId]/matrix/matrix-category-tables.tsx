'use client'

import {
  CATEGORY_ORDER,
  type DistributionStats,
  type GroupedByCategory,
  type MatrixCategory,
} from '@/lib/analytics/matrix-page-adapter'
import { MatrixCategoryTable } from './matrix-category-table'

type Props = {
  grouped: GroupedByCategory
  portfolioStats: Record<MatrixCategory, DistributionStats>
  locale: string
  currency: string
  hideEmptyQuadrants?: boolean
}

export function MatrixCategoryTables({
  grouped,
  portfolioStats,
  locale,
  currency,
  hideEmptyQuadrants = false,
}: Props) {
  const categories = hideEmptyQuadrants
    ? CATEGORY_ORDER.filter((category) => grouped[category].length > 0)
    : CATEGORY_ORDER

  return (
    <div className="flex flex-col gap-8">
      {categories.map((category: MatrixCategory) => (
        <MatrixCategoryTable
          key={category}
          category={category}
          items={grouped[category]}
          portfolioStats={portfolioStats[category]}
          locale={locale}
          currency={currency}
        />
      ))}
    </div>
  )
}
