'use client'

import type { PromotionCandidatesMilestoneData } from '../timeline/types'

export type MilestonePromotionCandidatesDataPreviewProps = {
  data: PromotionCandidatesMilestoneData
  labels: {
    grouping: string
    flatSummary: string
    promotionIdeas: string
    categoryMenu: string
    starHighlights: string
    puzzleHighlights: string
    notes: string
    emptyList: string
    emptyValue: string
  }
}

export function MilestonePromotionCandidatesDataPreview({
  data,
  labels,
}: MilestonePromotionCandidatesDataPreviewProps) {
  const categoryEntries = Object.entries(data.categories ?? {})

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-muted-foreground font-medium">{labels.grouping}</p>
        <p>{data.grouping}</p>
      </div>
      {data.grouping === 'flat' && (
        <div>
          <p className="text-muted-foreground font-medium">{labels.flatSummary}</p>
          <p className="whitespace-pre-wrap">
            {data.flatSummary.trim() ? data.flatSummary : labels.emptyValue}
          </p>
        </div>
      )}
      {data.grouping === 'by_menu_category' && categoryEntries.length > 0 && (
        <div className="space-y-3">
          {categoryEntries.map(([key, block]) => (
            <div className="border-border/80 rounded-md border p-3" key={key}>
              <p className="text-muted-foreground font-medium">{labels.categoryMenu}</p>
              <p className="mb-2 font-medium">{block.menuCategory || key}</p>
              <p className="text-muted-foreground mt-2 font-medium">{labels.starHighlights}</p>
              {block.starHighlights.length ? (
                <ul className="list-inside list-disc">
                  {block.starHighlights.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p>{labels.emptyList}</p>
              )}
              <p className="text-muted-foreground mt-2 font-medium">{labels.puzzleHighlights}</p>
              {block.puzzleHighlights.length ? (
                <ul className="list-inside list-disc">
                  {block.puzzleHighlights.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p>{labels.emptyList}</p>
              )}
              {block.notes?.trim() ? (
                <div className="mt-2">
                  <p className="text-muted-foreground font-medium">{labels.notes}</p>
                  <p className="whitespace-pre-wrap">{block.notes}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div>
        <p className="text-muted-foreground font-medium">{labels.promotionIdeas}</p>
        {data.promotionIdeas.length ? (
          <ul className="list-inside list-disc">
            {data.promotionIdeas.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p>{labels.emptyList}</p>
        )}
      </div>
    </div>
  )
}
