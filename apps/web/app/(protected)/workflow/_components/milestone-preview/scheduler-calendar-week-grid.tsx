'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import {
  SCHEDULER_GRID_HOUR_END,
  SCHEDULER_GRID_HOUR_START,
  buildSchedulerWeek,
  formatSchedulerWeekRange,
  schedulerHourIndexFromTime,
  schedulerHourLabels,
  schedulerSlotsByDate,
} from '@/lib/milestones/scheduler-calendar'

const TIME_GUTTER_WIDTH_PX = 52

export type SchedulerCalendarWeekGridProps = {
  weekStartIso: string
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

export function SchedulerCalendarWeekGrid({
  weekStartIso,
  windowStart,
  windowEnd,
  locale,
  slots = [],
  className,
}: SchedulerCalendarWeekGridProps) {
  const t = useTranslations('analytics.workflows.chat')

  const weekDays = useMemo(
    () => buildSchedulerWeek(weekStartIso, windowStart, windowEnd),
    [weekStartIso, windowEnd, windowStart],
  )
  const slotsByDate = useMemo(() => schedulerSlotsByDate(slots), [slots])
  const hourLabels = useMemo(
    () => schedulerHourLabels(locale, SCHEDULER_GRID_HOUR_START, SCHEDULER_GRID_HOUR_END),
    [locale],
  )
  const weekRange = useMemo(
    () => formatSchedulerWeekRange(weekStartIso, locale),
    [locale, weekStartIso],
  )
  const hourCount = hourLabels.length

  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-hidden rounded-lg border border-border/80 bg-background',
        className,
      )}
    >
      <div
        role="grid"
        aria-label={t('milestoneSchedulerPreviewWeekRange', {
          start: weekRange.start,
          end: weekRange.end,
        })}
        className="h-full min-w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `${TIME_GUTTER_WIDTH_PX}px repeat(7, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${hourCount}, minmax(0, 1fr))`,
          height: '100%',
        }}
      >
        <div
          role="presentation"
          className="sticky top-0 z-20 border-b border-r border-border/60 bg-muted/40"
        />

        {weekDays.map((day) => {
          const header = formatDayHeader(day.isoDate, locale)
          return (
            <div
              key={day.isoDate}
              role="columnheader"
              className={cn(
                'sticky top-0 z-20 border-b border-r border-border/60 bg-muted/40 px-1 py-2 text-center last:border-r-0',
                !day.inWindow && 'text-muted-foreground',
                day.isToday && day.inWindow && 'bg-primary/10 text-primary',
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide">{header.weekday}</p>
              <p className="text-sm font-semibold">{header.day}</p>
            </div>
          )
        })}

        {hourLabels.map((label, hourIndex) => (
          <SchedulerHourRow
            key={`${label}-${hourIndex}`}
            hourIndex={hourIndex}
            hourLabel={label}
            weekDays={weekDays}
            slotsByDate={slotsByDate}
            timeColumnLabel={t('milestoneSchedulerPreviewTimeColumnLabel')}
            slotAriaLabel={(title, time) => t('milestoneSchedulerPreviewSlotAria', { title, time })}
          />
        ))}
      </div>
    </div>
  )
}

type SchedulerHourRowProps = {
  hourIndex: number
  hourLabel: string
  weekDays: ReturnType<typeof buildSchedulerWeek>
  slotsByDate: ReturnType<typeof schedulerSlotsByDate>
  timeColumnLabel: string
  slotAriaLabel: (title: string, time: string) => string
}

function SchedulerHourRow({
  hourIndex,
  hourLabel,
  weekDays,
  slotsByDate,
  timeColumnLabel,
  slotAriaLabel,
}: SchedulerHourRowProps) {
  const rowIndex = hourIndex + 2

  return (
    <>
      <div
        role="rowheader"
        aria-label={`${timeColumnLabel}, ${hourLabel}`}
        className="sticky left-0 z-10 border-b border-r border-border/60 bg-background px-1 py-1 text-right text-[11px] leading-none text-muted-foreground"
        style={{ gridRow: rowIndex, gridColumn: 1 }}
      >
        <span className="relative -top-2 block pr-1">{hourLabel}</span>
      </div>

      {weekDays.map((day, dayIndex) => {
        const daySlots = slotsByDate.get(day.isoDate) ?? []
        const slotsInHour = daySlots.filter(
          (slot) => schedulerHourIndexFromTime(slot.time) === hourIndex,
        )

        return (
          <div
            key={`${day.isoDate}-${hourIndex}`}
            role="gridcell"
            aria-disabled={!day.inWindow}
            className={cn(
              'pointer-events-none relative border-b border-r border-border/60 p-0.5 last:border-r-0',
              !day.inWindow && 'bg-muted/30',
            )}
            style={{ gridRow: rowIndex, gridColumn: dayIndex + 2 }}
          >
            {slotsInHour.map((slot) => (
              <div
                key={`${slot.date}-${slot.time}-${slot.title}`}
                aria-label={slotAriaLabel(slot.title, slot.time)}
                className="rounded-md border border-sky-300/80 bg-sky-50/90 px-1.5 py-1 text-xs leading-snug text-foreground dark:border-sky-500/50 dark:bg-sky-950/40"
              >
                <span className="line-clamp-2 font-medium">{slot.title}</span>
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
