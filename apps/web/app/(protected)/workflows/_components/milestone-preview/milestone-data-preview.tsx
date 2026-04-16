'use client'

import { useTranslations } from 'next-intl'

import { MarkdownMessage } from '@/components/markdown-message'
import { datesMilestoneDataSchema } from '@/lib/graphql/node-schemas'

import type { TimelineMilestone } from '../timeline/types'

import { MilestoneDatesDataPreview } from './milestone-dates-data-preview'

export type MilestoneDataPreviewProps = {
  milestone: TimelineMilestone
}

export function MilestoneDataPreview({ milestone }: MilestoneDataPreviewProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const data = milestone.data

  if (data == null || (typeof data === 'string' && data.trim().length === 0)) {
    return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataEmpty')}</p>
  }

  if (typeof data === 'string') {
    return (
      <div className="min-h-0 overflow-auto rounded-md border p-4">
        <MarkdownMessage
          className="text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground/90 prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 first:prose-p:mt-0 last:prose-p:mb-0"
          content={data}
        />
      </div>
    )
  }

  if (typeof data === 'object') {
    const parsed = datesMilestoneDataSchema.safeParse(data)
    if (!parsed.success) {
      return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
    }

    return (
      <div className="min-h-0 overflow-auto rounded-md border p-4">
        <MilestoneDatesDataPreview
          data={parsed.data}
          labels={{
            startDate: t('milestoneDatesPreviewStartDate'),
            endDate: t('milestoneDatesPreviewEndDate'),
            publicHolidays: t('milestoneDatesPreviewPublicHolidays'),
            noHolidays: t('milestoneDatesPreviewNoHolidays'),
            emptyValue: t('milestoneDatesPreviewValueEmpty'),
          }}
        />
      </div>
    )
  }

  return <p className="text-muted-foreground text-sm">{t('milestonePreviewUnsupported')}</p>
}
