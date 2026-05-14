'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import {
  canGoToNextMonth,
  canGoToNextWeek,
  canGoToPreviousMonth,
  canGoToPreviousWeek,
  clampMonthStart,
  clampWeekStart,
  formatSchedulerMonthLabel,
  formatSchedulerWeekRange,
  monthStartIsoForWeek,
  nextMonthStartIso,
  nextWeekStartIso,
  previousMonthStartIso,
  previousWeekStartIso,
  startOfMonth,
  startOfWeekMonday,
  weekStartIsoForDay,
  weekStartIsoForMonth,
} from '@/lib/milestones/scheduler-calendar'

import { SchedulerCalendarMonthGrid } from './scheduler-calendar-month-grid'
import { SchedulerCalendarWeekGrid } from './scheduler-calendar-week-grid'

export type SchedulerCalendarViewMode = 'week' | 'month'

export type SchedulerCalendarProps = {
  windowStart: string
  windowEnd: string
  locale: string
  className?: string
}

export function SchedulerCalendar({
  windowStart,
  windowEnd,
  locale,
  className,
}: SchedulerCalendarProps) {
  const t = useTranslations('analytics.workflows.chat')

  const initialWeekStart = useMemo(() => {
    const anchor = parseIsoDateOnly(windowStart)
    if (!anchor) {
      return windowStart
    }
    return clampWeekStart(startOfWeekMonday(anchor), windowStart, windowEnd)
  }, [windowEnd, windowStart])

  const initialMonthStart = useMemo(() => {
    const anchor = parseIsoDateOnly(windowStart)
    if (!anchor) {
      return windowStart
    }
    return clampMonthStart(startOfMonth(anchor), windowStart, windowEnd)
  }, [windowEnd, windowStart])

  const [viewMode, setViewMode] = useState<SchedulerCalendarViewMode>('week')
  const [weekStartIso, setWeekStartIso] = useState(initialWeekStart)
  const [monthStartIso, setMonthStartIso] = useState(initialMonthStart)

  const weekRange = useMemo(
    () => formatSchedulerWeekRange(weekStartIso, locale),
    [locale, weekStartIso],
  )
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )

  const canGoPrevious =
    viewMode === 'week'
      ? canGoToPreviousWeek(weekStartIso, windowStart, windowEnd)
      : canGoToPreviousMonth(monthStartIso, windowStart, windowEnd)
  const canGoNext =
    viewMode === 'week'
      ? canGoToNextWeek(weekStartIso, windowStart, windowEnd)
      : canGoToNextMonth(monthStartIso, windowStart, windowEnd)

  const previousLabel =
    viewMode === 'week'
      ? t('milestoneSchedulerPreviewWeekPrevious')
      : t('milestoneSchedulerPreviewMonthPrevious')
  const nextLabel =
    viewMode === 'week'
      ? t('milestoneSchedulerPreviewWeekNext')
      : t('milestoneSchedulerPreviewMonthNext')
  const switchToMonthLabel = t('milestoneSchedulerPreviewViewMonth')
  const switchToWeekLabel = t('milestoneSchedulerPreviewViewWeek')
  const viewToggleLabel = viewMode === 'week' ? switchToMonthLabel : switchToWeekLabel

  const handleViewToggle = () => {
    if (viewMode === 'week') {
      setMonthStartIso(
        clampMonthStart(
          parseIsoDateOnly(monthStartIsoForWeek(weekStartIso)) ?? new Date(),
          windowStart,
          windowEnd,
        ),
      )
      setViewMode('month')
      return
    }

    setWeekStartIso(weekStartIsoForMonth(monthStartIso, weekStartIso, windowStart, windowEnd))
    setViewMode('week')
  }

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col', className)}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={!canGoPrevious}
          aria-label={previousLabel}
          onClick={() => {
            if (viewMode === 'week') {
              setWeekStartIso((current) =>
                clampWeekStart(
                  parseIsoDateOnly(previousWeekStartIso(current)) ?? new Date(),
                  windowStart,
                  windowEnd,
                ),
              )
              return
            }

            setMonthStartIso((current) =>
              clampMonthStart(
                parseIsoDateOnly(previousMonthStartIso(current)) ?? new Date(),
                windowStart,
                windowEnd,
              ),
            )
          }}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>

        <p className="min-w-0 flex-1 text-center text-sm font-medium text-foreground">
          {viewMode === 'week'
            ? t('milestoneSchedulerPreviewWeekRange', {
                start: weekRange.start,
                end: weekRange.end,
              })
            : monthLabel}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={!canGoNext}
            aria-label={nextLabel}
            onClick={() => {
              if (viewMode === 'week') {
                setWeekStartIso((current) =>
                  clampWeekStart(
                    parseIsoDateOnly(nextWeekStartIso(current)) ?? new Date(),
                    windowStart,
                    windowEnd,
                  ),
                )
                return
              }

              setMonthStartIso((current) =>
                clampMonthStart(
                  parseIsoDateOnly(nextMonthStartIso(current)) ?? new Date(),
                  windowStart,
                  windowEnd,
                ),
              )
            }}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={viewToggleLabel}
                  onClick={handleViewToggle}
                >
                  {viewMode === 'week' ? (
                    <CalendarDays aria-hidden className="size-4" />
                  ) : (
                    <Columns3 aria-hidden className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{viewToggleLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {viewMode === 'week' ? (
        <SchedulerCalendarWeekGrid
          weekStartIso={weekStartIso}
          windowStart={windowStart}
          windowEnd={windowEnd}
          locale={locale}
        />
      ) : (
        <SchedulerCalendarMonthGrid
          monthStartIso={monthStartIso}
          windowStart={windowStart}
          windowEnd={windowEnd}
          locale={locale}
          onDayClick={(isoDate) => {
            setWeekStartIso(weekStartIsoForDay(isoDate, windowStart, windowEnd))
            setViewMode('week')
          }}
        />
      )}
    </div>
  )
}
