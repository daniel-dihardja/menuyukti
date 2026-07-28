import { Suspense } from 'react'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { graphqlQuery } from '@/lib/graphql/client'
import { CRM_APPS_QUERY, type CrmAppsData } from '@/lib/graphql/queries/crm-apps'
import { CRM_CUSTOMERS_QUERY, type CrmCustomersData } from '@/lib/graphql/queries/crm-registrations'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { RegistrationsClient } from './_components/registrations-client'

function RegistrationsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}

function parseRequestedAppId(raw: string | undefined): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

function resolveInitialAppId(
  apps: Array<{ id: number }>,
  requestedAppId: number | null,
): number | null {
  if (requestedAppId !== null && apps.some((app) => app.id === requestedAppId)) {
    return requestedAppId
  }
  return apps.length === 1 ? (apps[0]?.id ?? null) : null
}

async function RegistrationsData({ requestedAppId }: { requestedAppId: number | null }) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await graphqlQuery<CrmAppsData>(CRM_APPS_QUERY, {}, userId)
  const apps = data.crmApps.map((app) => ({
    id: app.id,
    appId: app.appId,
    title: app.title,
    cashbackThresholdAmount: app.cashbackThresholdAmount,
    cashbackPercent: app.cashbackPercent,
  }))

  const initialAppId = resolveInitialAppId(apps, requestedAppId)

  let initialCustomers: CrmCustomersData['crmCustomers'] = []
  if (initialAppId !== null) {
    const customersData = await graphqlQuery<CrmCustomersData>(
      CRM_CUSTOMERS_QUERY,
      { appId: initialAppId },
      userId,
    )
    initialCustomers = customersData.crmCustomers
  }

  return (
    <RegistrationsClient
      apps={apps}
      initialAppId={initialAppId}
      initialCustomers={initialCustomers}
    />
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('platform.crm.registrations')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function CrmRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ appId?: string }>
}) {
  const t = await getTranslations('platform.crm')
  const tRegistrations = await getTranslations('platform.crm.registrations')
  const { appId: appIdParam } = await searchParams
  const requestedAppId = parseRequestedAppId(appIdParam)

  return (
    <AnalyticsPageShell
      title={tRegistrations('title')}
      breadcrumbs={[
        { label: t('breadcrumb'), href: routes.crm },
        { label: tRegistrations('breadcrumb') },
      ]}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{tRegistrations('title')}</h1>
        <p className="text-sm text-muted-foreground">{tRegistrations('description')}</p>
        <div className="pt-4">
          <Suspense fallback={<RegistrationsSkeleton />}>
            <RegistrationsData requestedAppId={requestedAppId} />
          </Suspense>
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
