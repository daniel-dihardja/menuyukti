'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import { parseIsoDateOnly } from '@/lib/calendar/scheduler-dates'
import type { CalendarPublicHoliday } from '@/lib/calendar/types'
import type { SchedulerSlot } from '@/lib/calendar/scheduler-calendar'
import {
  buildSchedulerMonth,
  formatSchedulerMonthLabel,
  SCHEDULER_HOLIDAY_BADGE_CLASS,
  SCHEDULER_WEEKEND_DAY_CLASS,
  schedulerSlotClassName,
  schedulerSlotDisplayTime,
  schedulerSlotDisplayTitle,
  schedulerSlotKind,
  schedulerSlotsForDate,
} from '@/lib/calendar/scheduler-calendar'

import { SchedulerSlotDisplayTitle } from './scheduler-calendar-slot-title'

export type SchedulerCalendarMonthListProps = {
  monthStartIso: string
  windowStart: string
  windowEnd: string
  locale: string
  slots?: SchedulerSlot[]
  publicHolidays?: CalendarPublicHoliday[]
  className?: string
  onDayClick?: (isoDate: string) => void
  onSlotClick?: (slot: SchedulerSlot) => void
  /** Show a create affordance on empty in-window days when create is available. */
  showCreateAffordance?: boolean
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
  publicHolidays = [],
  className,
  onDayClick,
  onSlotClick,
  showCreateAffordance = false,
}: SchedulerCalendarMonthListProps) {
  const t = useTranslations('analytics.workflows.chat')
  const monthDays = useMemo(
    () => buildSchedulerMonth(monthStartIso, windowStart, windowEnd).filter((day) => day.inMonth),
    [monthStartIso, windowEnd, windowStart],
  )
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )
  const holidayByDate = useMemo(
    () =>
      new Map(
        publicHolidays.map((holiday) => [
          holiday.date,
          holiday.name.trim().length > 0 ? holiday.name : holiday.date,
        ]),
      ),
    [publicHolidays],
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
          const dayDate = parseIsoDateOnly(day.isoDate)
          const dayOfWeek = dayDate?.getDay()
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
          const holidayName = holidayByDate.get(day.isoDate)
          const isPublicHoliday = holidayName !== undefined
          const clickable = Boolean(day.inWindow && onDayClick)

          return (
            <li
              key={day.isoDate}
              role="listitem"
              aria-disabled={!day.inWindow}
              tabIndex={clickable ? 0 : undefined}
              className={cn(
                'flex min-w-0 items-start gap-3 px-3 py-2.5',
                !day.inWindow && 'bg-muted/30 text-muted-foreground',
                isWeekend && day.inWindow && SCHEDULER_WEEKEND_DAY_CLASS,
                day.isToday && day.inWindow && 'bg-primary/10 text-primary',
                clickable &&
                  'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              )}
              onClick={
                clickable
                  ? () => {
                      onDayClick?.(day.isoDate)
                    }
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onDayClick?.(day.isoDate)
                      }
                    }
                  : undefined
              }
            >
              <div className="flex w-12 shrink-0 flex-col items-center">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {weekday}
                </span>
                <span className="text-base font-semibold leading-tight">{dayNumber}</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {(isWeekend || isPublicHoliday) && day.inWindow ? (
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    {isPublicHoliday ? (
                      <span
                        className={cn(SCHEDULER_HOLIDAY_BADGE_CLASS, 'px-1.5 py-0.5 text-xs')}
                        title={holidayName}
                      >
                        {t('milestoneSchedulerPreviewHolidayBadge')}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {daySlots.length > 0 ? (
                  daySlots.map((slot) => (
                    <button
                      key={`${slot.date}-${slot.time}-${slot.title}`}
                      type="button"
                      className={cn(
                        'flex min-w-0 max-w-full flex-col items-start break-words rounded-md border px-2 py-0.5 text-left text-xs font-medium leading-snug',
                        schedulerSlotClassName(schedulerSlotKind(slot)),
                        onSlotClick &&
                          'cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                      title={schedulerSlotDisplayTitle(slot)}
                      onClick={
                        onSlotClick
                          ? (event) => {
                              event.stopPropagation()
                              onSlotClick(slot)
                            }
                          : undefined
                      }
                      onKeyDown={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <span className="mb-0.5 text-xs font-semibold opacity-80">
                        {schedulerSlotDisplayTime(slot)}
                      </span>
                      <SchedulerSlotDisplayTitle slot={slot} className="w-full" />
                    </button>
                  ))
                ) : showCreateAffordance && clickable ? (
                  <span className="text-xs font-medium text-muted-foreground/70" aria-hidden>
                    +
                  </span>
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
