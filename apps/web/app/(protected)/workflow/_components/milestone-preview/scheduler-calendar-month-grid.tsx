'use client'

import { useMemo } from 'react'

import { cn } from '@workspace/ui/lib/utils'

import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import {
  buildSchedulerMonth,
  formatSchedulerMonthLabel,
  schedulerSlotClassName,
  schedulerSlotKind,
  schedulerSlotsForDate,
  schedulerWeekdayLabels,
} from '@/lib/milestones/scheduler-calendar'

export type SchedulerCalendarMonthGridProps = {
  monthStartIso: string
  windowStart: string
  windowEnd: string
  locale: string
  slots?: SchedulerMilestoneData['slots']
  className?: string
  onDayClick?: (isoDate: string) => void
}

function formatDayNumber(isoDate: string, locale: string): string {
  const date = parseIsoDateOnly(isoDate)
  if (!date) {
    return isoDate
  }
  return new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)
}

export function SchedulerCalendarMonthGrid({
  monthStartIso,
  windowStart,
  windowEnd,
  locale,
  slots = [],
  className,
  onDayClick,
}: SchedulerCalendarMonthGridProps) {
  const monthDays = useMemo(
    () => buildSchedulerMonth(monthStartIso, windowStart, windowEnd),
    [monthStartIso, windowEnd, windowStart],
  )
  const weekdayLabels = useMemo(() => schedulerWeekdayLabels(locale), [locale])
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )

  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-hidden rounded-lg border border-border/80 bg-background',
        className,
      )}
    >
      <div
        role="grid"
        aria-label={monthLabel}
        className="grid h-full min-w-full"
        style={{
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gridTemplateRows: 'auto repeat(6, minmax(0, 1fr))',
        }}
      >
        {weekdayLabels.map((label) => (
          <div
            key={label}
            role="columnheader"
            className="border-b border-r border-border/60 bg-muted/40 px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground last:border-r-0"
          >
            {label}
          </div>
        ))}

        {monthDays.map((day) => {
          const dayNumber = formatDayNumber(day.isoDate, locale)
          const clickable = day.inWindow && onDayClick
          const daySlots = schedulerSlotsForDate(slots, day.isoDate)

          return (
            <div
              key={day.isoDate}
              role="gridcell"
              aria-disabled={!day.inWindow}
              aria-label={dayNumber}
              className={cn(
                'flex min-h-0 flex-col border-b border-r border-border/60 p-1.5 last:border-r-0',
                !day.inMonth && 'text-muted-foreground/70',
                !day.inWindow && 'bg-muted/30 text-muted-foreground',
                day.isToday && day.inWindow && 'bg-primary/10 text-primary',
                clickable &&
                  'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              tabIndex={clickable ? 0 : undefined}
              onClick={
                clickable
                  ? () => {
                      onDayClick(day.isoDate)
                    }
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onDayClick(day.isoDate)
                      }
                    }
                  : undefined
              }
            >
              <span className="text-sm font-semibold">{dayNumber}</span>
              {daySlots.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {daySlots.slice(0, 1).map((slot) => (
                    <p
                      key={`${slot.date}-${slot.time}-${slot.title}`}
                      className={cn(
                        'truncate rounded-md border px-1 py-0.5 text-xs font-medium leading-snug',
                        schedulerSlotClassName(schedulerSlotKind(slot)),
                      )}
                    >
                      {slot.title}
                    </p>
                  ))}
                  {daySlots.length > 1 ? (
                    <span className="block size-1.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
