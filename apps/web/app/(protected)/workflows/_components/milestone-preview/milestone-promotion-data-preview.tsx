import type { PromotionCandidatesMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestonePromotionDataPreviewProps = {
  data: PromotionCandidatesMilestoneData
  labels: {
    placement: string
    puzzlePool: string
    puzzleItemsFound: string
    threshold: string
    selectedCount: string
    promotionCandidates: string
    rankedCandidates: string
    rankedCandidatesCount: string
    context: string
    campaignWindow: string
    brandBrief: string
    menu: string
    rationale: string
    instagram: string
    emptyList: string
    emptyValue: string
  }
}

export function MilestonePromotionDataPreview({
  data,
  labels,
}: MilestonePromotionDataPreviewProps) {
  const pool = data.puzzleOpportunityPool
  const ctx = data.context

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section>
        <h3 className="mb-1 font-medium text-foreground">{labels.placement}</h3>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {data.placement.trim() ? data.placement : labels.emptyValue}
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium text-foreground">{labels.puzzlePool}</h3>
        <dl className="grid grid-cols-[160px_1fr] gap-y-1 text-muted-foreground">
          <dt className="font-medium text-foreground">{labels.puzzleItemsFound}</dt>
          <dd>{pool.puzzleItemsFound}</dd>
          <dt className="font-medium text-foreground">{labels.threshold}</dt>
          <dd>{pool.threshold}</dd>
          <dt className="font-medium text-foreground">{labels.selectedCount}</dt>
          <dd>{pool.selectedCount}</dd>
        </dl>
      </section>

      <section>
        <h3 className="mb-1 font-medium text-foreground">{labels.promotionCandidates}</h3>
        {data.promotionCandidates.length === 0 ? (
          <p className="text-muted-foreground">{labels.emptyList}</p>
        ) : (
          <ul className="list-none space-y-4">
            {data.promotionCandidates.map((c) => (
              <li className="rounded-md border p-3" key={c.menu}>
                <p className="font-medium text-foreground">
                  {labels.menu}: {c.menu}
                </p>
                <p className="mt-1 text-muted-foreground">{labels.rationale}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {c.rationale.map((line, i) => (
                    <li key={`${c.menu}-r-${i}`}>{line}</li>
                  ))}
                </ul>
                {c.puzzleAnalysis ? (
                  <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                    {c.puzzleAnalysis}
                  </p>
                ) : null}
                {c.instagramPromotion ? (
                  <div className="mt-2 text-muted-foreground">
                    <p className="font-medium text-foreground">{labels.instagram}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      <li>{c.instagramPromotion.angle}</li>
                      <li>{c.instagramPromotion.format}</li>
                      <li>{c.instagramPromotion.cta}</li>
                      <li>{c.instagramPromotion.timing}</li>
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {ctx && (ctx.campaignWindowNotes || ctx.brandBriefAlignmentNotes) ? (
        <section>
          <h3 className="mb-1 font-medium text-foreground">{labels.context}</h3>
          {ctx.campaignWindowNotes ? (
            <p className="text-muted-foreground whitespace-pre-wrap">
              <span className="font-medium text-foreground">{labels.campaignWindow}: </span>
              {ctx.campaignWindowNotes}
            </p>
          ) : null}
          {ctx.brandBriefAlignmentNotes ? (
            <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
              <span className="font-medium text-foreground">{labels.brandBrief}: </span>
              {ctx.brandBriefAlignmentNotes}
            </p>
          ) : null}
        </section>
      ) : null}

      <section>
        <h3 className="mb-1 font-medium text-foreground">{labels.rankedCandidates}</h3>
        <p className="text-muted-foreground text-xs">
          {data.rankedCandidates.length === 0 ? labels.emptyList : labels.rankedCandidatesCount}
        </p>
      </section>
    </div>
  )
}
