export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { CustomToolsManager } from '@/app/(protected)/custom-tools/_components/custom-tools-manager'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  API_ADAPTER_TOOLS_QUERY,
  type ApiAdapterToolRow,
  type ApiAdapterToolsData,
  MY_WORKSPACE_QUERY,
  type MyWorkspaceData,
} from '@/lib/graphql/queries'
import { routes } from '@/lib/routes'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('customToolsPage')
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function CustomToolsPage() {
  const [t, tDash, { userId }] = await Promise.all([
    getTranslations('customToolsPage'),
    getTranslations('platform.dashboard'),
    auth(),
  ])

  let workspace: MyWorkspaceData['myWorkspace'] = null
  let tools: ApiAdapterToolRow[] = []

  if (userId) {
    const wsRaw = await graphqlQuery<MyWorkspaceData>(
      MY_WORKSPACE_QUERY,
      undefined,
      userId,
      'MyWorkspace',
    )
    workspace = wsRaw.myWorkspace
    if (workspace?.id) {
      const data = await graphqlQuery<ApiAdapterToolsData>(
        API_ADAPTER_TOOLS_QUERY,
        { workspaceId: workspace.id },
        userId,
        'ApiAdapterTools',
      )
      tools = data.apiAdapterTools
    }
  }

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: tDash('title'), href: routes.dashboard }, { label: t('title') }]}
    >
      <PageHeading description={t('description')} title={t('title')} />
      <CustomToolsManager
        initialTools={tools}
        workspaceId={workspace?.id ?? null}
        workspaceName={workspace?.name ?? null}
      />
    </AnalyticsPageShell>
  )
}
