import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { CalendarClient } from './_components/calendar-client'

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-[28rem] w-full rounded-lg" />
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

async function CalendarData({ requestedLocationId }: { requestedLocationId: number | null }) {
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

  return <CalendarClient branches={branches} initialLocationId={initialLocationId} />
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('platform.calendar')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const t = await getTranslations('platform.calendar')
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
      mainClassName="min-h-0"
    >
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData requestedLocationId={requestedLocationId} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
