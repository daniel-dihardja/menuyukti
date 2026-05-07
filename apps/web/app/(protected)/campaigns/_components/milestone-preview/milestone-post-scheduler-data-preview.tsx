import type { PostSchedulerMilestoneData } from '@/lib/graphql/node-schemas'

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
  }
}

export function MilestonePostSchedulerDataPreview({
  data,
  formatDate,
  labels,
}: MilestonePostSchedulerDataPreviewProps) {
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
    </div>
  )
}
