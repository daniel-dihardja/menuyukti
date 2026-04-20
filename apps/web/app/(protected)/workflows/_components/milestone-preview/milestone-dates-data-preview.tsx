import type { DatesMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestoneDatesDataPreviewProps = {
  data: DatesMilestoneData
  labels: {
    startDate: string
    endDate: string
    publicHolidays: string
    noHolidays: string
    emptyValue: string
  }
}

export function MilestoneDatesDataPreview({ data, labels }: MilestoneDatesDataPreviewProps) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
      <dt className="font-medium text-foreground">{labels.startDate}</dt>
      <dd className="text-muted-foreground">{data.startDate || labels.emptyValue}</dd>

      <dt className="font-medium text-foreground">{labels.endDate}</dt>
      <dd className="text-muted-foreground">{data.endDate || labels.emptyValue}</dd>

      <dt className="font-medium text-foreground">{labels.publicHolidays}</dt>
      <dd className="text-muted-foreground">
        {data.publicHolidays.length === 0 ? (
          labels.noHolidays
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {data.publicHolidays.map((holiday, index) => (
              <li key={`${holiday.name}-${holiday.date}-${index}`}>
                {[holiday.name, holiday.date, holiday.description]
                  .filter((part) => part.trim().length > 0)
                  .join(' - ')}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
  )
}
