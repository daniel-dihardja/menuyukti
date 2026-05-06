import type { CampaignBriefMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestoneCampaignBriefDataPreviewProps = {
  data: CampaignBriefMilestoneData
  labels: {
    startDate: string
    endDate: string
    publicHolidays: string
    noHolidays: string
    venueName: string
    city: string
    country: string
    currency: string
    contentPillars: string
    audienceHypotheses: string
    proofOrientedAngles: string
    toneGuardrails: string
    emptyList: string
    emptyValue: string
  }
}

function renderList(items: string[], emptyLabel: string) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

export function MilestoneCampaignBriefDataPreview({
  data,
  labels,
}: MilestoneCampaignBriefDataPreviewProps) {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2">
          <dt className="font-medium text-foreground">{labels.startDate}</dt>
          <dd className="text-muted-foreground">{data.startDate || labels.emptyValue}</dd>
          <dt className="font-medium text-foreground">{labels.endDate}</dt>
          <dd className="text-muted-foreground">{data.endDate || labels.emptyValue}</dd>
        </dl>
      </section>

      <section>
        <h4 className="font-medium text-foreground">{labels.publicHolidays}</h4>
        {data.publicHolidays.length === 0 ? (
          <p className="mt-2 text-muted-foreground text-sm">{labels.noHolidays}</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {data.publicHolidays.map((holiday, index) => (
              <li key={`${holiday.date}-${holiday.name}-${index}`}>
                <span className="font-medium text-foreground">{holiday.date}</span> - {holiday.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2">
          <dt className="font-medium text-foreground">{labels.venueName}</dt>
          <dd className="text-muted-foreground">
            {data.venueSnapshot.venueName || labels.emptyValue}
          </dd>
          <dt className="font-medium text-foreground">{labels.city}</dt>
          <dd className="text-muted-foreground">{data.venueSnapshot.city || labels.emptyValue}</dd>
          <dt className="font-medium text-foreground">{labels.country}</dt>
          <dd className="text-muted-foreground">
            {data.venueSnapshot.country || labels.emptyValue}
          </dd>
          <dt className="font-medium text-foreground">{labels.currency}</dt>
          <dd className="text-muted-foreground">
            {data.venueSnapshot.currency || labels.emptyValue}
          </dd>
        </dl>
      </section>

      <section>
        <h4 className="font-medium text-foreground">{labels.contentPillars}</h4>
        <div className="mt-2">{renderList(data.contentPillars, labels.emptyList)}</div>
      </section>

      <section>
        <h4 className="font-medium text-foreground">{labels.audienceHypotheses}</h4>
        <div className="mt-2">{renderList(data.audienceHypotheses, labels.emptyList)}</div>
      </section>

      <section>
        <h4 className="font-medium text-foreground">{labels.proofOrientedAngles}</h4>
        <div className="mt-2">{renderList(data.proofOrientedAngles, labels.emptyList)}</div>
      </section>

      <section>
        <h4 className="font-medium text-foreground">{labels.toneGuardrails}</h4>
        <div className="mt-2">{renderList(data.toneGuardrails, labels.emptyList)}</div>
      </section>
    </div>
  )
}
