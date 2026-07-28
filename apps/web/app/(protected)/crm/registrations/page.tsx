import { Suspense } from 'react'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
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

function parseRequestedLocationId(raw: string | undefined): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

function resolveInitialLocationId(
  branches: Array<{ id: number }>,
  requestedLocationId: number | null,
): number | null {
  if (
    requestedLocationId !== null &&
    branches.some((branch) => branch.id === requestedLocationId)
  ) {
    return requestedLocationId
  }
  return branches.length === 1 ? (branches[0]?.id ?? null) : null
}

async function RegistrationsData({ requestedLocationId }: { requestedLocationId: number | null }) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocationsListData(userId)
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  const initialLocationId = resolveInitialLocationId(branches, requestedLocationId)

  return <RegistrationsClient branches={branches} initialLocationId={initialLocationId} />
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
  searchParams: Promise<{ locationId?: string }>
}) {
  const t = await getTranslations('platform.crm')
  const tRegistrations = await getTranslations('platform.crm.registrations')
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)

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
            <RegistrationsData requestedLocationId={requestedLocationId} />
          </Suspense>
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
