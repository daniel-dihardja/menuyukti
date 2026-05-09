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
        const fitLabel =
          item.storytellingFit === 'strong' ? labels.storytellingStrong : labels.storytellingWeak
        const rationale = item.storytellingRationale?.trim()
        return (
          <li key={`${item.name}-${index}`} className="border-l-2 border-muted pl-3">
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              <span>{fitLabel}</span>
              {rationale ? (
                <>
                  {' · '}
                  <span className="font-medium">{labels.storytellingWhy}:</span> {rationale}
                </>
              ) : null}
            </p>
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
