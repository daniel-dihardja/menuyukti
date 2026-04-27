import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'

export type MilestoneSchedulerDataPreviewProps = {
  data: SchedulerMilestoneData
  labels: {
    dateTime: string
    type: string
    promotedMenuItems: string
    visualIdea: string
    captionIdea: string
    emptyList: string
    emptyValue: string
  }
}

function formatScheduleDateTime(value: string, emptyValue: string): string {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return emptyValue
  }

  const parsedDate = new Date(trimmedValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(parsedDate)
  const date = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
  const weekdayWithSuffix = weekday.endsWith('.') ? weekday : `${weekday}.`

  return `${weekdayWithSuffix} ${date}`
}

export function MilestoneSchedulerDataPreview({
  data,
  labels,
}: MilestoneSchedulerDataPreviewProps) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <section>
        {data.schedules.length === 0 ? (
          <p className="text-muted-foreground">{labels.emptyList}</p>
        ) : (
          <ul className="list-none space-y-4">
            {data.schedules.map((schedule, index) => (
              <li className="rounded-md p-3" key={`${schedule.dateTime}-${index}`}>
                <dl className="grid grid-cols-[180px_1fr] gap-y-1">
                  <dt className="font-medium text-foreground">{labels.dateTime}</dt>
                  <dd className="text-muted-foreground">
                    {formatScheduleDateTime(schedule.dateTime, labels.emptyValue)}
                  </dd>
                  <dt className="font-medium text-foreground">{labels.type}</dt>
                  <dd className="text-muted-foreground">{schedule.type}</dd>
                  <dt className="font-medium text-foreground">{labels.promotedMenuItems}</dt>
                  <dd className="text-muted-foreground">
                    {schedule.promotedMenuItems.length > 0
                      ? schedule.promotedMenuItems.join(', ')
                      : labels.emptyValue}
                  </dd>
                  <dt className="font-medium text-foreground">{labels.visualIdea}</dt>
                  <dd className="text-muted-foreground whitespace-pre-wrap">
                    {schedule.visualIdea.trim() ? schedule.visualIdea : labels.emptyValue}
                  </dd>
                  <dt className="font-medium text-foreground">{labels.captionIdea}</dt>
                  <dd className="text-muted-foreground whitespace-pre-wrap">
                    {schedule.captionIdea.trim() ? schedule.captionIdea : labels.emptyValue}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
