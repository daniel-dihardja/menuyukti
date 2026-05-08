import type { PromotionCandidatesMilestoneData } from '@/lib/graphql/node-schemas'

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
  }
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
                  <p>
                    {labels.starItemsLabel}:{' '}
                    {bucket.starItems.length > 0 ? bucket.starItems.join(', ') : '—'}
                  </p>
                  <p>
                    {labels.puzzleItemsLabel}:{' '}
                    {bucket.puzzleItems.length > 0 ? bucket.puzzleItems.join(', ') : '—'}
                  </p>
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
