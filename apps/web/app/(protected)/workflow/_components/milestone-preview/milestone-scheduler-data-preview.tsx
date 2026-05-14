'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type { SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import { parseIsoDateOnly, resolveSchedulerWindow } from '@/lib/milestones/scheduler-dates'

import { useTimelineWorkspaceState } from '../timeline-context'
import type { TimelineMilestone } from '../timeline/types'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'
import { SchedulerCalendar } from './scheduler-calendar'

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

export function MilestoneSchedulerDataPreview({ milestone }: MilestoneSchedulerDataPreviewProps) {
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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
      <p className={`shrink-0 ${mp.sectionTitle}`}>{t('milestoneSchedulerPreviewHeading')}</p>
      <SchedulerCalendar
        className="min-h-0 flex-1"
        locale={locale}
        windowEnd={window.endDate}
        windowStart={window.startDate}
      />
    </div>
  )
}
