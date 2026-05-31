import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import { schedulerSlotDisplayTitleParts } from '@/lib/milestones/scheduler-calendar'

type SchedulerSlot = SchedulerMilestoneData['slots'][number]

export function SchedulerSlotDisplayTitle({
  slot,
  className,
}: {
  slot: SchedulerSlot
  className?: string
}) {
  const { typeLabel, name } = schedulerSlotDisplayTitleParts(slot)

  return (
    <span className={className}>
      <span className="font-bold">{typeLabel}</span>
      {name ? `: ${name}` : null}
    </span>
  )
}
