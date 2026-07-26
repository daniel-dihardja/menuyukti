import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  getCachedAnalyticsRunsByLocation,
  getCachedLocationsListData,
  getCachedWorkflowsByLocation,
} from '@/lib/graphql/cached-queries'
import { type AnyNode } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { cn } from '@workspace/ui/lib/utils'
import { WorkflowsClient } from './_components/workflows-client'

function WorkflowsListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-11 w-44 shrink-0" />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <div className="-mx-4 w-[calc(100%+2rem)] border-x-0 border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
          <div className="flex flex-col gap-3 px-4 py-3">
            <div className="flex gap-4 border-b pb-2">
              <Skeleton className="h-4 w-8 shrink-0" />
              <Skeleton className="h-4 min-w-0 flex-1" />
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
            {Array.from({ length: 5 }, (_, i) => (
              <div className="flex gap-4" key={`workflows-skel-${i}`}>
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 min-w-0 flex-1" />
                <Skeleton className="h-4 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>
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

async function WorkflowsData({ requestedLocationId }: { requestedLocationId: number | null }) {
  const t = await getTranslations('analytics.workflows')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocationsListData(userId)
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
    nodeId: loc.nodeId,
  }))

  const hasBranches = branches.length > 0

  if (!hasBranches) {
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
  const initialAnalyticsRuns: Array<{ id: number; name: string }> = []
  const initialWorkflows: AnyNode[] = []
  if (initialLocationId !== null) {
    const [runs, workflowNodes] = await Promise.all([
      getCachedAnalyticsRunsByLocation(userId, initialLocationId),
      getCachedWorkflowsByLocation(userId, initialLocationId),
    ])
    initialAnalyticsRuns.push(...runs)
    initialWorkflows.push(...workflowNodes)
  }

  return (
    <WorkflowsClient
      branches={branches}
      initialLocationId={initialLocationId}
      initialWorkflows={initialWorkflows}
      initialAnalyticsRuns={initialAnalyticsRuns}
    />
  )
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const t = await getTranslations('analytics.workflows')
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading title={t('title')} description={t('description')} />
        <Suspense fallback={<WorkflowsListSkeleton />}>
          <WorkflowsData requestedLocationId={requestedLocationId} />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
