import type { CultureHooksMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestoneCultureHooksDataPreviewProps = {
  data: CultureHooksMilestoneData
  labels: {
    locationConcept: string
    targetAudience: string
    intersections: string
    emptyIntersections: string
    topic: string
    conceptLink: string
    audienceRelevance: string
    contentExample: string
    guardrailCheck: string
  }
}

export function MilestoneCultureHooksDataPreview({
  data,
  labels,
}: MilestoneCultureHooksDataPreviewProps) {
  return (
    <div className="flex flex-col gap-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.locationConcept}</p>
        <p className="text-muted-foreground">{data.locationConcept || '-'}</p>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.targetAudience}</p>
        <p className="text-muted-foreground">{data.targetAudience || '-'}</p>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-foreground">{labels.intersections}</p>
        {data.intersections.length === 0 ? (
          <p className="text-muted-foreground">{labels.emptyIntersections}</p>
        ) : (
          <ol className="list-decimal space-y-3 pl-5">
            {data.intersections.map((row, index) => (
              <li key={`${row.topic}-${index}`} className="space-y-1 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{labels.topic}:</span> {row.topic}
                </p>
                <p>
                  <span className="font-medium text-foreground">{labels.conceptLink}:</span>{' '}
                  {row.conceptLink}
                </p>
                <p>
                  <span className="font-medium text-foreground">{labels.audienceRelevance}:</span>{' '}
                  {row.audienceRelevance}
                </p>
                <p>
                  <span className="font-medium text-foreground">{labels.contentExample}:</span>{' '}
                  {row.contentExample}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{labels.guardrailCheck}</p>
        <p className="text-muted-foreground">{data.guardrailCheck || '-'}</p>
      </div>
    </div>
  )
}
