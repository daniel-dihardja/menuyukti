import type { PostSchedulerMilestoneData } from '@/lib/graphql/node-schemas'

export type PromotionCategoryPreviewRow = {
  categoryName: string
  starItems: string[]
  puzzleItems: string[]
}

export function toPromotionCategoryPreviewRows(
  data: PostSchedulerMilestoneData,
  maxItems = 5,
): PromotionCategoryPreviewRow[] {
  const candidates = data.promotionCandidates
  if (!candidates) {
    return []
  }
  if (candidates.grouping === 'by_menu_category' && candidates.categories) {
    return Object.entries(candidates.categories).map(([categoryName, bucket]) => ({
      categoryName,
      starItems: bucket.starItems.slice(0, maxItems),
      puzzleItems: bucket.puzzleItems.slice(0, maxItems),
    }))
  }
  const starItems = (candidates.starItems ?? []).slice(0, maxItems)
  const puzzleItems = (candidates.puzzleItems ?? []).slice(0, maxItems)
  if (starItems.length === 0 && puzzleItems.length === 0) {
    return []
  }
  return [{ categoryName: '', starItems, puzzleItems }]
}

export type MilestonePostSchedulerDataPreviewProps = {
  data: PostSchedulerMilestoneData
  formatDate: (isoDate: string) => string
  labels: {
    daysHeading: string
    weekdaysCount: string
    weekendsCount: string
    postsHeading: string
    emptyPosts: string
    dayDateTime: string
    postType: string
    contentType: string
    promotedItems: string
    captionIdea: string
    promotionCandidatesHeading: string
    emptyPromotionCandidates: string
    uncategorizedCategory: string
    starItems: string
    puzzleItems: string
  }
}

export function MilestonePostSchedulerDataPreview({
  data,
  formatDate,
  labels,
}: MilestonePostSchedulerDataPreviewProps) {
  const categoryRows = toPromotionCategoryPreviewRows(data)

  return (
    <div className="flex flex-col gap-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.daysHeading}</p>
        <p className="text-muted-foreground">
          {labels.weekdaysCount}: {data.daySummary.weekdayCount}
        </p>
        <p className="text-muted-foreground">
          {labels.weekendsCount}: {data.daySummary.weekendCount}
        </p>
      </div>
      <p className="font-medium text-foreground">{labels.postsHeading}</p>
      {data.posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{labels.emptyPosts}</p>
      ) : (
        <ol className="list-decimal space-y-4 pl-5">
          {data.posts.map((post, i) => (
            <li key={`${post.date}-${post.time}-${i}`} className="space-y-1">
              <p className="font-medium text-foreground">
                {labels.dayDateTime}: {formatDate(post.date)} · {post.time}
              </p>
              <p className="text-muted-foreground">
                {labels.postType}: {post.postType} · {labels.contentType}: {post.contentType}
              </p>
              <p className="text-muted-foreground">
                {labels.promotedItems}: {post.promotedMenuItems.join(', ') || '—'}
              </p>
              <p className="text-muted-foreground">
                {labels.captionIdea}: {post.captionIdea || '—'}
              </p>
            </li>
          ))}
        </ol>
      )}
      <div className="space-y-2">
        <p className="font-medium text-foreground">{labels.promotionCandidatesHeading}</p>
        {categoryRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{labels.emptyPromotionCandidates}</p>
        ) : (
          <div className="space-y-3">
            {categoryRows.map(({ categoryName, starItems, puzzleItems }) => {
              return (
                <div key={categoryName} className="space-y-1">
                  <p className="font-medium text-foreground">
                    {categoryName.trim() || labels.uncategorizedCategory}
                  </p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>{labels.starItems}:</p>
                    {starItems.length === 0 ? (
                      <p>—</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {starItems.map((item) => (
                          <li key={`star-${categoryName}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <p>{labels.puzzleItems}:</p>
                    {puzzleItems.length === 0 ? (
                      <p>—</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {puzzleItems.map((item) => (
                          <li key={`puzzle-${categoryName}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
