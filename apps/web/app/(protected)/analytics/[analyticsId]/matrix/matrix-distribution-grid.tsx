'use client'

import { useTranslations } from 'next-intl'

import {
  CATEGORY_ORDER,
  type DistributionStats,
  type MatrixCategory,
} from '@/lib/analytics/matrix-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'
import { cn } from '@workspace/ui/lib/utils'

type Props = {
  portfolioStats: Record<MatrixCategory, DistributionStats>
  selectedCategories: Set<MatrixCategory>
  onToggleCategory: (category: MatrixCategory) => void
}

export function MatrixDistributionGrid({
  portfolioStats,
  selectedCategories,
  onToggleCategory,
}: Props) {
  const tDist = useTranslations('analytics.matrix.distribution')
  const tCategories = useTranslations('analytics.matrix.categories')
  const tGrid = useTranslations('analytics.matrix.distributionGrid')
  const tPortfolio = useTranslations('analytics.matrix.portfolio')

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{tGrid('title')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORY_ORDER.map((category) => {
          const stats = portfolioStats[category]
          const isSelected = selectedCategories.has(category)
          const itemSharePct = `${(stats.itemShare * 100).toFixed(1)}%`
          const marginSharePct = `${(stats.marginShare * 100).toFixed(1)}%`

          return (
            <Card
              key={category}
              className={cn(
                'gap-0 overflow-hidden py-0 shadow-none transition-colors',
                isSelected ? 'border-primary/40 bg-primary/5' : 'opacity-60 hover:opacity-100',
              )}
            >
              <button
                type="button"
                className="flex w-full flex-col gap-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => onToggleCategory(category)}
                aria-pressed={isSelected}
                aria-label={tGrid('toggleAriaLabel', { category: tCategories(category) })}
              >
                <CardHeader className="gap-2 px-4">
                  <Badge
                    variant="outline"
                    className={cn('w-fit', MATRIX_CATEGORY_BADGE_CLASS[category])}
                  >
                    {tCategories(category)}
                  </Badge>
                  <CardTitle className="text-base">
                    {tPortfolio('itemCount', { count: stats.itemCount })}
                  </CardTitle>
                  <CardDescription>
                    {tDist('share')} {itemSharePct} · {tDist('margin')} {marginSharePct}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <p className="mb-2 text-xs text-muted-foreground">{tGrid('marginShareLabel')}</p>
                  <Progress value={stats.marginShare * 100} aria-label={marginSharePct} />
                </CardContent>
              </button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
