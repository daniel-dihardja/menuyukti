import { getTranslations } from 'next-intl/server'

import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { InstagramSignalsMatrixItem } from '@/lib/graphql/queries/analytics'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'

type MatrixItemsSectionProps = {
  items: InstagramSignalsMatrixItem[]
  emptyLabel: string
  locale: string
  currency: string
  menuColumn: string
  categoryColumn: string
  revenueColumn: string
}

function MatrixCategoryBadge({ category, label }: { category: string; label: string }) {
  const key = category as MatrixCategory
  const className = MATRIX_CATEGORY_BADGE_CLASS[key]
  if (!className) {
    return <Badge variant="outline">{label}</Badge>
  }
  return (
    <Badge variant="outline" className={cn('font-normal', className)}>
      {label}
    </Badge>
  )
}

export async function MatrixItemsSection({
  items,
  emptyLabel,
  locale,
  currency,
  menuColumn,
  categoryColumn,
  revenueColumn,
}: MatrixItemsSectionProps) {
  const tCategories = await getTranslations('analytics.matrix.categories')

  if (items.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground sm:px-6">{emptyLabel}</p>
  }

  function categoryLabel(category: string): string {
    const key = category as MatrixCategory
    if (key in MATRIX_CATEGORY_BADGE_CLASS) {
      return tCategories(key)
    }
    return category
  }

  return (
    <>
      <ul className="flex flex-col md:hidden">
        {items.map((item, index) => (
          <li key={item.menu} className="min-w-0 px-4 py-3 sm:px-6">
            {index > 0 ? <Separator className="mb-3" /> : null}
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug break-words">{item.menu}</p>
                {item.menuCategory ? (
                  <p className="text-xs text-muted-foreground">{item.menuCategory}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MatrixCategoryBadge
                  category={item.matrixCategory}
                  label={categoryLabel(item.matrixCategory)}
                />
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatCurrencyWithCode(item.totalRevenue, currency, locale)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{menuColumn}</TableHead>
              <TableHead>{categoryColumn}</TableHead>
              <TableHead className="text-right">{revenueColumn}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.menu}>
                <TableCell className="min-w-0 max-w-xs whitespace-normal">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium">{item.menu}</span>
                    {item.menuCategory ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.menuCategory}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <MatrixCategoryBadge
                    category={item.matrixCategory}
                    label={categoryLabel(item.matrixCategory)}
                  />
                </TableCell>
                <TableCell className="shrink-0 text-right tabular-nums">
                  {formatCurrencyWithCode(item.totalRevenue, currency, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
