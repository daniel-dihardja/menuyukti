'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import { parseIsoDateOnly, resolveSchedulerWindow } from '@/lib/milestones/scheduler-dates'

import { useTimelineWorkspaceState } from '../timeline-context'
import type { TimelineMilestone } from '../timeline/types'
import { SchedulerCalendar } from '@/components/scheduler-calendar/scheduler-calendar'
import { SchedulerScheduleExplanation } from './scheduler-schedule-explanation'

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

export function MilestoneSchedulerDataPreview({
  milestone,
  data,
}: MilestoneSchedulerDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const locale = useLocale()
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

  const scheduleExplanation = data.scheduleExplanation?.trim()

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <SchedulerCalendar
        className="min-h-0 flex-1"
        locale={locale}
        slots={data.slots ?? []}
        publicHolidays={window.publicHolidays}
        windowEnd={window.endDate}
        windowStart={window.startDate}
      />
      {scheduleExplanation ? (
        <SchedulerScheduleExplanation scheduleExplanation={scheduleExplanation} />
      ) : null}
    </div>
  )
}
