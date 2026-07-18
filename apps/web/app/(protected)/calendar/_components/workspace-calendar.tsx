'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { SchedulerCalendarMonthGrid } from '@/components/scheduler-calendar/scheduler-calendar-month-grid'
import {
  addDays,
  formatSchedulerMonthLabel,
  isoDateOnlyFromDate,
  nextMonthStartIso,
  previousMonthStartIso,
  startOfMonth,
  startOfWeekMonday,
} from '@/lib/milestones/scheduler-calendar'
import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'

export type WorkspaceCalendarProps = {
  locale: string
  className?: string
}

/** Visible 6×7 grid bounds so every cell is an active day (Google-style month). */
function monthViewWindow(monthStartIso: string): { windowStart: string; windowEnd: string } {
  const monthStart = parseIsoDateOnly(monthStartIso)
  if (!monthStart) {
    return { windowStart: monthStartIso, windowEnd: monthStartIso }
  }
  const gridStart = startOfWeekMonday(startOfMonth(monthStart))
  const gridEnd = addDays(gridStart, 41)
  return {
    windowStart: isoDateOnlyFromDate(gridStart),
    windowEnd: isoDateOnlyFromDate(gridEnd),
  }
}

function currentMonthStartIso(): string {
  return isoDateOnlyFromDate(startOfMonth(new Date()))
}

export function WorkspaceCalendar({ locale, className }: WorkspaceCalendarProps) {
  const t = useTranslations('platform.calendar')
  const [monthStartIso, setMonthStartIso] = useState(currentMonthStartIso)

  const { windowStart, windowEnd } = useMemo(() => monthViewWindow(monthStartIso), [monthStartIso])
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col', className)}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label={t('monthPrevious')}
          onClick={() => {
            setMonthStartIso((current) => previousMonthStartIso(current))
          }}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <p className="min-w-0 text-center text-sm font-medium text-foreground">{monthLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => {
              setMonthStartIso(currentMonthStartIso())
            }}
          >
            {t('today')}
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label={t('monthNext')}
          onClick={() => {
            setMonthStartIso((current) => nextMonthStartIso(current))
          }}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>

      <SchedulerCalendarMonthGrid
        className="min-h-0 flex-1"
        monthStartIso={monthStartIso}
        windowStart={windowStart}
        windowEnd={windowEnd}
        locale={locale}
        slots={[]}
        publicHolidays={[]}
        onDayClick={(isoDate) => {
          const day = parseIsoDateOnly(isoDate)
          if (!day) {
            return
          }
          const dayMonthStart = isoDateOnlyFromDate(startOfMonth(day))
          if (dayMonthStart !== monthStartIso) {
            setMonthStartIso(dayMonthStart)
          }
        }}
      />
    </div>
  )
}
