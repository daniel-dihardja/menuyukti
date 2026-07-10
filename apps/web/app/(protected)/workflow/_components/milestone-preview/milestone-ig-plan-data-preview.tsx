'use client'

import { useTranslations } from 'next-intl'

import { MarkdownMessage } from '@/components/markdown-message'
import type { IgPlanMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneIgPlanDataPreviewProps = {
  data: IgPlanMilestoneData
}

export function MilestoneIgPlanDataPreview({ data }: MilestoneIgPlanDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const planMarkdown = data.planMarkdown.trim()

  if (!planMarkdown) {
    return (
      <div className={mp.root}>
        <p className={mp.body}>{t('milestoneIgPlanPreviewEmptyPlan')}</p>
      </div>
    )
  }

  return (
    <div className={mp.root}>
      <MarkdownMessage
        className="prose-base prose-p:my-2 prose-headings:scroll-mt-20"
        content={planMarkdown}
      />
    </div>
  )
}
