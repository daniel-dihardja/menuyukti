import { getTranslations } from 'next-intl/server'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { WorkflowWorkspaceSkeleton } from '../_components/workflow-workspace-skeleton'

export default async function WorkflowDetailLoading() {
  const tWorkflows = await getTranslations('analytics.workflows')
  const tChat = await getTranslations('analytics.workflows.chat')
  const title = tChat('pageLoadingTitle')

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: tWorkflows('title'), href: routes.workflows.list }, { label: title }]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <WorkflowWorkspaceSkeleton className="min-h-0 flex-1" />
    </AnalyticsPageShell>
  )
}
