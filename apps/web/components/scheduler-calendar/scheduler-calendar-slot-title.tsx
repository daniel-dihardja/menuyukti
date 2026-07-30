import type { SchedulerSlot } from '@/lib/calendar/scheduler-calendar'
import { schedulerSlotDisplayTitleParts } from '@/lib/calendar/scheduler-calendar'

export function SchedulerSlotDisplayTitle({
  slot,
  className,
}: {
  slot: SchedulerSlot
  className?: string
}) {
  const { typeLabel, name } = schedulerSlotDisplayTitleParts(slot)

  if (!typeLabel) {
    return <span className={className}>{name}</span>
  }

  return (
    <span className={className}>
      <span className="font-bold">{typeLabel}</span>
      {name ? `: ${name}` : null}
    </span>
  )
}
