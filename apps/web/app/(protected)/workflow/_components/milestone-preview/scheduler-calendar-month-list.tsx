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
} from '@/lib/milestones/scheduler-calendar'

export type SchedulerCalendarMonthListProps = {
  monthStartIso: string
  windowStart: string
  windowEnd: string
  locale: string
  slots?: SchedulerMilestoneData['slots']
  className?: string
}

function formatDayHeader(isoDate: string, locale: string): { weekday: string; day: string } {
  const date = parseIsoDateOnly(isoDate)
  if (!date) {
    return { weekday: isoDate, day: '' }
  }

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    .format(date)
    .replace(/\.+$/, '')
    .trim()
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)

  return { weekday, day }
}

export function SchedulerCalendarMonthList({
  monthStartIso,
  windowStart,
  windowEnd,
  locale,
  slots = [],
  className,
}: SchedulerCalendarMonthListProps) {
  const monthDays = useMemo(
    () => buildSchedulerMonth(monthStartIso, windowStart, windowEnd).filter((day) => day.inMonth),
    [monthStartIso, windowEnd, windowStart],
  )
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )

  return (
    <div
      className={cn(
        'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-lg border border-border/80 bg-background',
        className,
      )}
    >
      <ul role="list" aria-label={monthLabel} className="min-w-0 divide-y divide-border/60">
        {monthDays.map((day) => {
          const { weekday, day: dayNumber } = formatDayHeader(day.isoDate, locale)
          const daySlots = schedulerSlotsForDate(slots, day.isoDate)

          return (
            <li
              key={day.isoDate}
              role="listitem"
              aria-disabled={!day.inWindow}
              className={cn(
                'flex min-w-0 items-start gap-3 px-3 py-2.5',
                !day.inWindow && 'bg-muted/30 text-muted-foreground',
                day.isToday && day.inWindow && 'bg-primary/10 text-primary',
              )}
            >
              <div className="flex w-12 shrink-0 flex-col items-center">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {weekday}
                </span>
                <span className="text-base font-semibold leading-tight">{dayNumber}</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {daySlots.length > 0 ? (
                  daySlots.map((slot) => (
                    <p
                      key={`${slot.date}-${slot.time}-${slot.title}`}
                      className={cn(
                        'min-w-0 max-w-full break-words rounded-md border px-2 py-0.5 text-xs font-medium leading-snug',
                        schedulerSlotClassName(schedulerSlotKind(slot)),
                      )}
                      title={slot.title}
                    >
                      {slot.title}
                    </p>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground/60" aria-hidden>
                    —
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
