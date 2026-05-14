'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import {
  SCHEDULER_GRID_HOUR_END,
  SCHEDULER_GRID_HOUR_START,
  buildSchedulerWeek,
  canGoToNextWeek,
  canGoToPreviousWeek,
  clampWeekStart,
  formatSchedulerWeekRange,
  nextWeekStartIso,
  previousWeekStartIso,
  schedulerHourLabels,
  startOfWeekMonday,
} from '@/lib/milestones/scheduler-calendar'

const TIME_GUTTER_WIDTH_PX = 52

export type SchedulerCalendarGridProps = {
  windowStart: string
  windowEnd: string
  locale: string
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

export function SchedulerCalendarGrid({
  windowStart,
  windowEnd,
  locale,
  className,
}: SchedulerCalendarGridProps) {
  const t = useTranslations('analytics.workflows.chat')

  const initialWeekStart = useMemo(() => {
    const anchor = parseIsoDateOnly(windowStart)
    if (!anchor) {
      return windowStart
    }
    return clampWeekStart(startOfWeekMonday(anchor), windowStart, windowEnd)
  }, [windowEnd, windowStart])

  const [weekStartIso, setWeekStartIso] = useState(initialWeekStart)

  const weekDays = useMemo(
    () => buildSchedulerWeek(weekStartIso, windowStart, windowEnd),
    [weekStartIso, windowEnd, windowStart],
  )
  const hourLabels = useMemo(
    () => schedulerHourLabels(locale, SCHEDULER_GRID_HOUR_START, SCHEDULER_GRID_HOUR_END),
    [locale],
  )
  const weekRange = useMemo(
    () => formatSchedulerWeekRange(weekStartIso, locale),
    [locale, weekStartIso],
  )

  const canGoPrevious = canGoToPreviousWeek(weekStartIso, windowStart, windowEnd)
  const canGoNext = canGoToNextWeek(weekStartIso, windowStart, windowEnd)
  const hourCount = hourLabels.length

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col', className)}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={!canGoPrevious}
          aria-label={t('milestoneSchedulerPreviewWeekPrevious')}
          onClick={() => {
            setWeekStartIso((current) =>
              clampWeekStart(
                parseIsoDateOnly(previousWeekStartIso(current)) ?? new Date(),
                windowStart,
                windowEnd,
              ),
            )
          }}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>

        <p className="min-w-0 flex-1 text-center text-sm font-medium text-foreground">
          {t('milestoneSchedulerPreviewWeekRange', {
            start: weekRange.start,
            end: weekRange.end,
          })}
        </p>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={!canGoNext}
          aria-label={t('milestoneSchedulerPreviewWeekNext')}
          onClick={() => {
            setWeekStartIso((current) =>
              clampWeekStart(
                parseIsoDateOnly(nextWeekStartIso(current)) ?? new Date(),
                windowStart,
                windowEnd,
              ),
            )
          }}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/80 bg-background">
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
              timeColumnLabel={t('milestoneSchedulerPreviewTimeColumnLabel')}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type SchedulerHourRowProps = {
  hourIndex: number
  hourLabel: string
  weekDays: ReturnType<typeof buildSchedulerWeek>
  timeColumnLabel: string
}

function SchedulerHourRow({
  hourIndex,
  hourLabel,
  weekDays,
  timeColumnLabel,
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

      {weekDays.map((day, dayIndex) => (
        <div
          key={`${day.isoDate}-${hourIndex}`}
          role="gridcell"
          aria-disabled={!day.inWindow}
          className={cn(
            'pointer-events-none border-b border-r border-border/60 last:border-r-0',
            !day.inWindow && 'bg-muted/30',
          )}
          style={{ gridRow: rowIndex, gridColumn: dayIndex + 2 }}
        />
      ))}
    </>
  )
}
