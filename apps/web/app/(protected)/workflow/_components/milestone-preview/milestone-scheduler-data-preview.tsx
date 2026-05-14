'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Calendar } from '@workspace/ui/components/calendar'

import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import { formatPreviewDateString } from '@/lib/format-preview-date'
import {
  holidayDatesFromWindow,
  parseIsoDateOnly,
  resolveSchedulerWindow,
} from '@/lib/milestones/scheduler-dates'

import { useTimelineWorkspaceState } from '../timeline-context'
import type { TimelineMilestone } from '../timeline/types'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneSchedulerDataPreviewProps = {
  milestone: TimelineMilestone
  data: SchedulerMilestoneData
}

function PreviewStateMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function usePrefersSingleMonthCalendar(): boolean {
  const [singleMonth, setSingleMonth] = useState(true)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setSingleMonth(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return singleMonth
}

export function MilestoneSchedulerDataPreview({ milestone }: MilestoneSchedulerDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const locale = useLocale()
  const singleMonth = usePrefersSingleMonthCalendar()
  const {
    milestoneState: { milestones },
  } = useTimelineWorkspaceState()

  const resolution = useMemo(
    () => resolveSchedulerWindow({ milestone, milestones }),
    [milestone, milestones],
  )

  if (resolution.status === 'no_prior_dates') {
    return (
      <PreviewStateMessage
        title={t('milestoneSchedulerPreviewNoPriorDatesTitle')}
        body={t('milestoneSchedulerPreviewNoPriorDatesBody')}
      />
    )
  }

  if (resolution.status === 'incomplete_window') {
    return (
      <PreviewStateMessage
        title={t('milestoneSchedulerPreviewIncompleteWindowTitle')}
        body={t('milestoneSchedulerPreviewIncompleteWindowBody')}
      />
    )
  }

  const { window } = resolution
  const startDate = parseIsoDateOnly(window.startDate)
  const endDate = parseIsoDateOnly(window.endDate)
  if (!startDate || !endDate) {
    return (
      <PreviewStateMessage
        title={t('milestoneSchedulerPreviewIncompleteWindowTitle')}
        body={t('milestoneSchedulerPreviewIncompleteWindowBody')}
      />
    )
  }

  const holidayDates = holidayDatesFromWindow(window)
  const formatDate = (value: string) => formatPreviewDateString(value, locale)

  return (
    <div className={mp.root}>
      <div className="space-y-1">
        <p className={mp.sectionTitle}>{t('milestoneSchedulerPreviewHeading')}</p>
        {window.sourceDatesTitle ? (
          <p className={mp.bodySmall}>
            {t('milestoneSchedulerPreviewSourceDates', { title: window.sourceDatesTitle })}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`flex gap-3 ${mp.insetCard}`}>
          <CalendarRange aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className={mp.fieldLabel}>{t('milestoneSchedulerPreviewStartDate')}</p>
            <p className={mp.bodyStrong}>{formatDate(window.startDate)}</p>
          </div>
        </div>
        <div className={`flex gap-3 ${mp.insetCard}`}>
          <CalendarRange aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className={mp.fieldLabel}>{t('milestoneSchedulerPreviewEndDate')}</p>
            <p className={mp.bodyStrong}>{formatDate(window.endDate)}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Calendar
          className="mx-auto"
          defaultMonth={startDate}
          disabled={[{ before: startDate }, { after: endDate }]}
          endMonth={endDate}
          fromDate={startDate}
          modifiers={{ holiday: holidayDates }}
          modifiersClassNames={{
            holiday:
              'bg-amber-100 font-semibold text-amber-950 dark:bg-amber-950/60 dark:text-amber-100',
          }}
          numberOfMonths={singleMonth ? 1 : 2}
          showOutsideDays={false}
          startMonth={startDate}
          toDate={endDate}
        />
      </div>

      {holidayDates.length > 0 ? (
        <p className={mp.bodySmall}>{t('milestoneSchedulerPreviewHolidayLegend')}</p>
      ) : null}

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{t('milestoneSchedulerPreviewPublicHolidays')}</p>
        {window.publicHolidays.length === 0 ? (
          <p className={mp.body}>{t('milestoneSchedulerPreviewNoHolidays')}</p>
        ) : (
          <ul className="space-y-2">
            {window.publicHolidays.map((holiday) => (
              <li key={`${holiday.date}:${holiday.name}`} className={mp.insetCard}>
                <p className={mp.bodyStrong}>{formatDate(holiday.date)}</p>
                <p className={`mt-1 ${mp.bodyStrong}`}>{holiday.name}</p>
                <p className={`mt-2 ${mp.bodySmall}`}>{holiday.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
