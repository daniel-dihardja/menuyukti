'use client'

import {
  CATEGORY_ORDER,
  type GroupedByCategory,
  type MatrixCategory,
} from '@/lib/analytics/matrix-page-adapter'
import { MatrixCategoryTable } from './matrix-category-table'

type Props = {
  grouped: GroupedByCategory
  locale: string
  currency: string
}

export function MatrixCategoryTables({ grouped, locale, currency }: Props) {
  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((category: MatrixCategory) => (
        <MatrixCategoryTable
          key={category}
          category={category}
          items={grouped[category]}
          locale={locale}
          currency={currency}
        />
      ))}
    </div>
  )
}
