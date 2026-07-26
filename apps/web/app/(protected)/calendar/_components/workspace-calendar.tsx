'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { SchedulerCalendarMonthGrid } from '@/components/scheduler-calendar/scheduler-calendar-month-grid'
import type { CalendarMediaRef, CalendarSourceRef } from '@/lib/calendar/client-api'
import type { CalendarDisplaySlot } from '@/lib/graphql/queries/scheduler-calendar'
import type { CampaignWindowPublicHoliday } from '@/lib/graphql/node-schemas'
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

import { CalendarEntryDialog, type CalendarEntryDialogValues } from './create-calendar-entry-dialog'

export type WorkspaceCalendarProps = {
  locale: string
  locationId: number | null
  slots?: CalendarDisplaySlot[]
  publicHolidays?: CampaignWindowPublicHoliday[]
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

function defaultTime(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')
  return `${hours}:${minutes}`
}

function createDraftValues(dateIso: string): CalendarEntryDialogValues {
  return {
    title: '',
    description: '',
    dateIso,
    time: defaultTime(),
    mediaRefs: [],
    sourceRef: null,
  }
}

function slotToEditValues(
  slot:
    | CalendarDisplaySlot
    | {
        id?: string | null
        title: string
        description?: string | null
        date: string
        time: string
        mediaRefs?: Array<{ kind: string; name: string }> | null
        source?: string | null
        sourceRef?: CalendarSourceRef | null
      },
): CalendarEntryDialogValues | null {
  if (slot.source !== 'manual' || !slot.id) {
    return null
  }
  const id = Number(slot.id)
  if (!Number.isInteger(id) || id < 1) {
    return null
  }
  const mediaRefs: CalendarMediaRef[] = []
  for (const ref of slot.mediaRefs ?? []) {
    if (ref.kind === 'photo' && ref.name.trim()) {
      mediaRefs.push({ kind: 'photo', name: ref.name })
    }
  }

  const sourceRef =
    slot.sourceRef?.type === 'instagram_item' &&
    slot.sourceRef.workflowId.trim() &&
    slot.sourceRef.itemId.trim()
      ? {
          type: 'instagram_item' as const,
          workflowId: slot.sourceRef.workflowId,
          itemId: slot.sourceRef.itemId,
        }
      : null

  return {
    id,
    title: slot.title,
    description: slot.description ?? '',
    dateIso: slot.date,
    time: slot.time,
    mediaRefs,
    sourceRef,
  }
}

export function WorkspaceCalendar({
  locale,
  locationId,
  slots = [],
  publicHolidays = [],
  className,
}: WorkspaceCalendarProps) {
  const t = useTranslations('platform.calendar')
  const tEntry = useTranslations('platform.calendar.createEntry')
  const router = useRouter()
  const [monthStartIso, setMonthStartIso] = useState(currentMonthStartIso)
  const [dialogInitial, setDialogInitial] = useState<CalendarEntryDialogValues | null>(null)

  const { windowStart, windowEnd } = useMemo(() => monthViewWindow(monthStartIso), [monthStartIso])
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )

  const canCreate = locationId !== null

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
        slots={slots}
        publicHolidays={publicHolidays}
        showCreateAffordance={canCreate}
        onDayClick={(isoDate) => {
          const day = parseIsoDateOnly(isoDate)
          if (!day) {
            return
          }
          const dayMonthStart = isoDateOnlyFromDate(startOfMonth(day))
          if (dayMonthStart !== monthStartIso) {
            setMonthStartIso(dayMonthStart)
          }
          if (canCreate) {
            setDialogInitial(createDraftValues(isoDate))
          }
        }}
        onSlotClick={(slot) => {
          const values = slotToEditValues(slot)
          if (!values) {
            toast.message(tEntry('workflowSlotReadonly'))
            return
          }
          if (canCreate) {
            setDialogInitial(values)
          }
        }}
      />

      {locationId !== null && dialogInitial !== null ? (
        <CalendarEntryDialog
          open
          locationId={locationId}
          locale={locale}
          initial={dialogInitial}
          onOpenChange={(open) => {
            if (!open) setDialogInitial(null)
          }}
          onSaved={() => {
            router.refresh()
          }}
        />
      ) : null}
    </div>
  )
}
