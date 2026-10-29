'use client'

import { useTranslations } from 'next-intl'

import { AdvisorWorkspaceCogsForm } from '@/components/chat/advisor-workspace-cogs-form'
import { isFeatureEnabled } from '@/lib/feature-flags'

type Props = {
  activeAnalyticsRunId: number | null
}

export function AdvisorWorkspaceCogsTab({ activeAnalyticsRunId }: Props) {
  const t = useTranslations('chat.workspace')
  const cogsEnabled = isFeatureEnabled('cogs')

  if (!cogsEnabled) {
    return (
      <div className="p-3">
        <p className="text-muted-foreground text-sm">{t('cogsDisabled')}</p>
      </div>
    )
  }

  if (activeAnalyticsRunId == null) {
    return (
      <div className="p-3">
        <p className="text-muted-foreground text-sm">{t('cogsSelectReportHint')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <AdvisorWorkspaceCogsForm analyticsRunId={activeAnalyticsRunId} />
    </div>
  )
}
