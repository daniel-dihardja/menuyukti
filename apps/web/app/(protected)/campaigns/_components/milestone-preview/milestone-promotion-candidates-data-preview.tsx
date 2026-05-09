import { Badge } from '@workspace/ui/components/badge'

import type {
  PromotionCandidateMenuItem,
  PromotionCandidatesMilestoneData,
} from '@/lib/graphql/node-schemas'

export type MilestonePromotionCandidatesDataPreviewProps = {
  data: PromotionCandidatesMilestoneData
  labels: {
    heading: string
    mainCategoryLabel: string
    emptyCategory: string
    starItemsLabel: string
    puzzleItemsLabel: string
    notesLabel: string
    noNotes: string
    storytellingStrong: string
    storytellingWeak: string
    storytellingWhy: string
  }
}

function renderMenuItems(
  items: PromotionCandidateMenuItem[],
  labels: MilestonePromotionCandidatesDataPreviewProps['labels'],
) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">—</p>
  }

  return (
    <ul className="list-none space-y-3 pl-0">
      {items.map((item, index) => {
        const isStrong = item.storytellingFit === 'strong'
        const fitLabel = isStrong ? labels.storytellingStrong : labels.storytellingWeak
        const rationale = item.storytellingRationale?.trim()
        const storytellingBadgeClassName = isStrong
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100'
        return (
          <li key={`${item.name}-${index}`} className="border-l-2 border-muted pl-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground">{item.name}</span>
              <Badge variant="outline" className={storytellingBadgeClassName}>
                {fitLabel}
              </Badge>
            </div>
            {rationale ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{labels.storytellingWhy}:</span>{' '}
                {rationale}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function MilestonePromotionCandidatesDataPreview({
  data,
  labels,
}: MilestonePromotionCandidatesDataPreviewProps) {
  return (
    <div className="flex flex-col gap-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.heading}</p>
        <p className="text-muted-foreground">
          {labels.mainCategoryLabel}: {data.mainCategory}
        </p>
      </div>

      <div className="space-y-3">
        {data.categories.map((bucket) => {
          const hasItems = bucket.starItems.length > 0 || bucket.puzzleItems.length > 0
          return (
            <div key={bucket.category} className="space-y-2">
              <p className="font-medium text-foreground">{bucket.category}</p>
              {!hasItems ? (
                <p className="text-muted-foreground">{labels.emptyCategory}</p>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <div className="space-y-1">
                    <p>{labels.starItemsLabel}:</p>
                    {renderMenuItems(bucket.starItems, labels)}
                  </div>
                  <div className="space-y-1">
                    <p>{labels.puzzleItemsLabel}:</p>
                    {renderMenuItems(bucket.puzzleItems, labels)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.notesLabel}</p>
        <p className="text-muted-foreground">{data.notes?.trim() ? data.notes : labels.noNotes}</p>
      </div>
    </div>
  )
}
