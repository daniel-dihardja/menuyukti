import type { DatesMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestoneDatesDataPreviewProps = {
  data: DatesMilestoneData
  locale: string
  labels: {
    startDate: string
    endDate: string
    publicHolidays: string
    noHolidays: string
    emptyValue: string
  }
}

function formatDateWithDay(dateStr: string, locale: string): string {
  // Expects ISO date string YYYY-MM-DD; parse as local date to avoid UTC offset shift
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const date = new Date(year, month - 1, day)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return `${weekday} ${dd}.${mm}.${year}`
}

export function MilestoneDatesDataPreview({
  data,
  locale,
  labels,
}: MilestoneDatesDataPreviewProps) {
  return (
    <div className="flex flex-col gap-y-3 text-sm">
      <dl className="grid grid-cols-[140px_1fr] gap-y-2">
        <dt className="font-medium text-foreground">{labels.startDate}</dt>
        <dd className="text-muted-foreground">
          {data.startDate ? formatDateWithDay(data.startDate, locale) : labels.emptyValue}
        </dd>

        <dt className="font-medium text-foreground">{labels.endDate}</dt>
        <dd className="text-muted-foreground">
          {data.endDate ? formatDateWithDay(data.endDate, locale) : labels.emptyValue}
        </dd>
      </dl>

      <div className="flex flex-col gap-y-1">
        <p className="font-medium text-foreground">{labels.publicHolidays}</p>
        {data.publicHolidays.length === 0 ? (
          <p className="text-muted-foreground">{labels.noHolidays}</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {data.publicHolidays.map((holiday, index) => (
              <li key={`${holiday.name}-${holiday.date}-${index}`}>
                {[holiday.name, holiday.date, holiday.description]
                  .filter((part) => part.trim().length > 0)
                  .join(' - ')}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
