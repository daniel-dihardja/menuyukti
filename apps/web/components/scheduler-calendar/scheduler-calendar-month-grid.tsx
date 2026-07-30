'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import { parseIsoDateOnly } from '@/lib/calendar/scheduler-dates'
import type { SchedulerSlot } from '@/lib/calendar/scheduler-calendar'
import type { CampaignWindowPublicHoliday } from '@/lib/calendar/types'
import {
  buildSchedulerMonth,
  formatSchedulerMonthLabel,
  SCHEDULER_HOLIDAY_BADGE_CLASS,
  SCHEDULER_WEEKEND_DAY_CLASS,
  SCHEDULER_WEEKEND_HEADER_CLASS,
  schedulerSlotClassName,
  schedulerSlotDisplayTime,
  schedulerSlotDisplayTitle,
  schedulerSlotKind,
  schedulerSlotsForDate,
  schedulerWeekdayLabels,
} from '@/lib/calendar/scheduler-calendar'

import { SchedulerSlotDisplayTitle } from './scheduler-calendar-slot-title'

export type SchedulerCalendarMonthGridProps = {
  monthStartIso: string
  windowStart: string
  windowEnd: string
  locale: string
  slots?: SchedulerSlot[]
  publicHolidays?: CampaignWindowPublicHoliday[]
  className?: string
  onDayClick?: (isoDate: string) => void
  onSlotClick?: (slot: SchedulerSlot) => void
  /** Show a faint + affordance on empty in-window days when create is available. */
  showCreateAffordance?: boolean
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
  publicHolidays = [],
  className,
  onDayClick,
  onSlotClick,
  showCreateAffordance = false,
}: SchedulerCalendarMonthGridProps) {
  const t = useTranslations('analytics.workflows.chat')
  const monthDays = useMemo(
    () => buildSchedulerMonth(monthStartIso, windowStart, windowEnd),
    [monthStartIso, windowEnd, windowStart],
  )
  const weekdayLabels = useMemo(() => schedulerWeekdayLabels(locale), [locale])
  const weekendWeekdayIndexes = useMemo(() => new Set([5, 6]), [])
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
        {weekdayLabels.map((label, weekdayIndex) => (
          <div
            key={label}
            role="columnheader"
            className={cn(
              'border-b border-r border-border/60 bg-muted/40 px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground last:border-r-0',
              weekendWeekdayIndexes.has(weekdayIndex) && SCHEDULER_WEEKEND_HEADER_CLASS,
            )}
          >
            {label}
          </div>
        ))}

        {monthDays.map((day) => {
          const dayNumber = formatDayNumber(day.isoDate, locale)
          const clickable = day.inWindow && onDayClick
          const daySlots = schedulerSlotsForDate(slots, day.isoDate)
          const dayDate = parseIsoDateOnly(day.isoDate)
          const dayOfWeek = dayDate?.getDay()
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
          const holidayName = holidayByDate.get(day.isoDate)
          const isPublicHoliday = holidayName !== undefined

          return (
            <div
              key={day.isoDate}
              role="gridcell"
              aria-disabled={!day.inWindow}
              aria-label={dayNumber}
              className={cn(
                'group/day flex min-h-0 flex-col border-b border-r border-border/60 p-1.5 last:border-r-0',
                !day.inMonth && 'text-muted-foreground/70',
                !day.inWindow && 'bg-muted/30 text-muted-foreground',
                isWeekend && day.inWindow && SCHEDULER_WEEKEND_DAY_CLASS,
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
              <div className="flex items-start justify-between gap-1">
                <span className="shrink-0 text-sm font-semibold">{dayNumber}</span>
                <div className="flex shrink-0 items-center gap-1">
                  {isPublicHoliday ? (
                    <span
                      className={cn(SCHEDULER_HOLIDAY_BADGE_CLASS, 'px-1 py-0.5 text-[9px]')}
                      title={holidayName}
                    >
                      {t('milestoneSchedulerPreviewHolidayBadge')}
                    </span>
                  ) : null}
                  {showCreateAffordance && clickable && daySlots.length === 0 ? (
                    <span
                      aria-hidden
                      className="rounded-sm px-1 text-xs font-medium text-muted-foreground/50 opacity-0 transition-opacity group-hover/day:opacity-100"
                    >
                      +
                    </span>
                  ) : null}
                </div>
              </div>
              {daySlots.length > 0 ? (
                <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                  {daySlots.map((slot, slotIndex) => (
                    <button
                      key={`${slot.date}-${slot.time}-${slot.title}-${slotIndex}`}
                      type="button"
                      title={schedulerSlotDisplayTitle(slot)}
                      className={cn(
                        'flex w-full shrink-0 flex-col items-start rounded-md border px-1 py-0.5 text-left text-xs font-medium leading-snug',
                        schedulerSlotClassName(schedulerSlotKind(slot)),
                        onSlotClick &&
                          'cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
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
                      <span className="mb-0.5 text-[10px] font-semibold opacity-80">
                        {schedulerSlotDisplayTime(slot)}
                      </span>
                      <SchedulerSlotDisplayTitle slot={slot} className="w-full truncate" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
