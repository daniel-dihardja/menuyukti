export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { getTranslations } from 'next-intl/server'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import { IMAGE_AI_FLOWS_QUERY, type ImageAiFlowsData } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'

import { ImageFlowsManager } from './_components/image-flows-manager'

export default async function Page() {
  const tImageFlows = await getTranslations('imageFlows')
  const tStudio = await getTranslations('sidebar')
  const { userId } = await auth()
  if (!userId) {
    redirect(routes.login)
  }

  const flowsData = await graphqlQuery<ImageAiFlowsData>(
    IMAGE_AI_FLOWS_QUERY,
    { includeInactive: true },
    userId,
  )

  return (
    <AnalyticsPageShell
      title={tStudio('studio')}
      breadcrumbs={[{ label: tStudio('studio'), href: routes.studio }]}
    >
      <PageHeading title={tStudio('studio')} description={tImageFlows('pageDescription')} />
      <ImageFlowsManager initialFlows={flowsData.imageAiFlows} />
    </AnalyticsPageShell>
  )
}
