import type { DatesMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestoneDatesDataPreviewProps = {
  data: DatesMilestoneData
  formatDate: (value: string) => string
  labels: {
    startDate: string
    endDate: string
    publicHolidays: string
    noHolidays: string
  }
}

export function MilestoneDatesDataPreview({
  data,
  formatDate,
  labels,
}: MilestoneDatesDataPreviewProps) {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="text-muted-foreground">{labels.startDate}</p>
        <p className="font-medium text-foreground">{formatDate(data.startDate)}</p>
      </div>
      <div className="space-y-1">
        <p className="text-muted-foreground">{labels.endDate}</p>
        <p className="font-medium text-foreground">{formatDate(data.endDate)}</p>
      </div>
      <div className="space-y-2">
        <p className="text-muted-foreground">{labels.publicHolidays}</p>
        {data.publicHolidays.length === 0 ? (
          <p className="text-muted-foreground">{labels.noHolidays}</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {data.publicHolidays.map((holiday) => (
              <li key={`${holiday.date}:${holiday.name}`}>
                {formatDate(holiday.date)} - {holiday.name}: {holiday.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
