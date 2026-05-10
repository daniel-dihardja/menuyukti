import type { CultureHooksMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

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
    emptyValue: string
  }
}

export function MilestoneCultureHooksDataPreview({
  data,
  labels,
}: MilestoneCultureHooksDataPreviewProps) {
  return (
    <div className={mp.root}>
      <div className="space-y-2">
        <p className={mp.sectionTitle}>{labels.locationConcept}</p>
        <p className={mp.body}>{data.locationConcept?.trim() || labels.emptyValue}</p>
      </div>

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{labels.targetAudience}</p>
        <p className={mp.body}>{data.targetAudience?.trim() || labels.emptyValue}</p>
      </div>

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{labels.intersections}</p>
        {data.intersections.length === 0 ? (
          <p className={mp.body}>{labels.emptyIntersections}</p>
        ) : (
          <ol className={`${mp.listDecimal} space-y-4`}>
            {data.intersections.map((row, index) => (
              <li key={`${row.topic}-${index}`} className={mp.insetCard}>
                <div className="space-y-2">
                  <p className={mp.body}>
                    <span className={mp.rowKey}>{labels.topic}:</span> {row.topic}
                  </p>
                  <p className={mp.body}>
                    <span className={mp.rowKey}>{labels.conceptLink}:</span> {row.conceptLink}
                  </p>
                  <p className={mp.body}>
                    <span className={mp.rowKey}>{labels.audienceRelevance}:</span>{' '}
                    {row.audienceRelevance}
                  </p>
                  <p className={mp.body}>
                    <span className={mp.rowKey}>{labels.contentExample}:</span> {row.contentExample}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{labels.guardrailCheck}</p>
        <p className={mp.body}>{data.guardrailCheck?.trim() || labels.emptyValue}</p>
      </div>
    </div>
  )
}
