import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import {
  getCachedAnalyticsRunsByLocation,
  getCachedLocationsListData,
} from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import { AgentThreadsClient } from './_components/agent-threads-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agentChat')
  const title = t('metaTitle')
  const description = t('metaDescription')
  return {
    title,
    description,
    openGraph: { title, description },
  }
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

function AgentListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

async function AgentListData({ requestedLocationId }: { requestedLocationId: number | null }) {
  const t = await getTranslations('agentChat')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationsPromise = getCachedLocationsListData(userId)
  const requestedRunsPromise =
    requestedLocationId !== null
      ? getCachedAnalyticsRunsByLocation(userId, requestedLocationId)
      : null

  const data = await locationsPromise
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  if (branches.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-dashed p-8 text-center">
        <h2 className="text-lg font-medium">{t('noBranches.title')}</h2>
        <p className="mx-auto max-w-md text-muted-foreground text-sm">
          {t('noBranches.description')}
        </p>
        <Button asChild size="lg">
          <Link href={routes.analytics.branchesCreate}>{t('noBranches.cta')}</Link>
        </Button>
      </div>
    )
  }

  const initialLocationId = resolveInitialLocationId(branches, requestedLocationId)
  let initialAnalyticsRuns: Array<{ id: number; name: string }> = []
  if (initialLocationId !== null) {
    if (requestedRunsPromise !== null && initialLocationId === requestedLocationId) {
      initialAnalyticsRuns = await requestedRunsPromise
    } else {
      initialAnalyticsRuns = await getCachedAnalyticsRunsByLocation(userId, initialLocationId)
    }
  }

  return (
    <AgentThreadsClient
      branches={branches}
      initialAnalyticsRuns={initialAnalyticsRuns}
      initialLocationId={initialLocationId}
    />
  )
}

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const t = await getTranslations('agentChat')
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)

  return (
    <AnalyticsPageShell
      breadcrumbs={[{ label: t('metaTitle') }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      title={t('metaTitle')}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading description={t('listDescription')} title={t('metaTitle')} />
        <Suspense fallback={<AgentListSkeleton />}>
          <AgentListData requestedLocationId={requestedLocationId} />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
