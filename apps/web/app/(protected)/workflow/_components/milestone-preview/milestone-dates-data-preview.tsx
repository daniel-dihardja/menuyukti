import { CalendarRange } from 'lucide-react'

import type { DatesMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

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
    <div className={mp.root}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`flex gap-3 ${mp.insetCard}`}>
          <CalendarRange aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className={mp.fieldLabel}>{labels.startDate}</p>
            <p className={mp.bodyStrong}>{formatDate(data.startDate)}</p>
          </div>
        </div>
        <div className={`flex gap-3 ${mp.insetCard}`}>
          <CalendarRange aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className={mp.fieldLabel}>{labels.endDate}</p>
            <p className={mp.bodyStrong}>{formatDate(data.endDate)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{labels.publicHolidays}</p>
        {data.publicHolidays.length === 0 ? (
          <p className={mp.body}>{labels.noHolidays}</p>
        ) : (
          <ul className="space-y-2">
            {data.publicHolidays.map((holiday) => (
              <li key={`${holiday.date}:${holiday.name}`} className={mp.insetCard}>
                <p className={mp.bodyStrong}>{formatDate(holiday.date)}</p>
                <p className={`mt-1 ${mp.bodyStrong}`}>{holiday.name}</p>
                <p className={`mt-2 ${mp.bodySmall}`}>{holiday.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
