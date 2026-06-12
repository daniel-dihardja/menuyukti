'use client'

import { useTranslations } from 'next-intl'

import { CATEGORY_ORDER, type MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import { Badge } from '@workspace/ui/components/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@workspace/ui/components/hover-card'
import { cn } from '@workspace/ui/lib/utils'

const QUADRANT_POINT_CLASS: Record<MatrixCategory, string> = {
  star: 'bg-emerald-500',
  plow_horse: 'bg-amber-500',
  puzzle: 'bg-sky-500',
  low_end: 'bg-rose-500',
}

export function MatrixQuadrantLegend() {
  const tCategories = useTranslations('analytics.matrix.categories')
  const tHelp = useTranslations('analytics.matrix.quadrantHelp')

  return (
    <div className="flex flex-wrap gap-3">
      {CATEGORY_ORDER.map((category) => (
        <HoverCard key={category} openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <span
                className={cn('size-2.5 shrink-0 rounded-full', QUADRANT_POINT_CLASS[category])}
                aria-hidden
              />
              <Badge
                variant="outline"
                className={cn('font-normal', MATRIX_CATEGORY_BADGE_CLASS[category])}
              >
                {tCategories(category)}
              </Badge>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="text-sm">{tHelp(category)}</HoverCardContent>
        </HoverCard>
      ))}
    </div>
  )
}
