import { Suspense } from 'react'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { graphqlQuery } from '@/lib/graphql/client'
import { DEFAULT_LIST_FIRST } from '@/lib/graphql/pagination'
import { CRM_APPS_QUERY, type CrmAppsData } from '@/lib/graphql/queries/crm-apps'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { AppsClient } from './_components/apps-client'

function AppsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}

async function AppsData() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await graphqlQuery<CrmAppsData>(
    CRM_APPS_QUERY,
    { first: DEFAULT_LIST_FIRST },
    userId,
  )
  return <AppsClient initialApps={data.crmApps} />
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('platform.crm.apps')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function CrmAppsPage() {
  const t = await getTranslations('platform.crm')
  const tApps = await getTranslations('platform.crm.apps')

  return (
    <AnalyticsPageShell
      title={tApps('title')}
      breadcrumbs={[{ label: t('breadcrumb'), href: routes.crm }, { label: tApps('breadcrumb') }]}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{tApps('title')}</h1>
        <p className="text-sm text-muted-foreground">{tApps('description')}</p>
        <div className="pt-4">
          <Suspense fallback={<AppsSkeleton />}>
            <AppsData />
          </Suspense>
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
