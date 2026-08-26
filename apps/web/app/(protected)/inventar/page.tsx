import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import {
  getCachedInventoryCatalog,
  getCachedInventoryStock,
  getCachedLocationsListData,
} from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { InventarStockClient } from './_components/inventar-stock-client'

function InventarSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-48 w-full rounded-lg" />
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

async function InventarData({ requestedLocationId }: { requestedLocationId: number | null }) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationsPromise = getCachedLocationsListData(userId)
  const workspacePromise = graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)

  const [locationsData, workspaceData] = await Promise.all([locationsPromise, workspacePromise])

  const branches = locationsData.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  const initialLocationId = resolveInitialLocationId(branches, requestedLocationId)
  const workspaceIdRaw = workspaceData.myWorkspace?.id
  const workspaceId =
    workspaceIdRaw != null && Number.isInteger(Number(workspaceIdRaw)) && Number(workspaceIdRaw) > 0
      ? Number(workspaceIdRaw)
      : null

  const [stockRows, catalogItems] = await Promise.all([
    initialLocationId != null
      ? getCachedInventoryStock(userId, initialLocationId)
      : Promise.resolve([]),
    workspaceId != null ? getCachedInventoryCatalog(userId, workspaceId) : Promise.resolve([]),
  ])

  return (
    <InventarStockClient
      branches={branches}
      initialLocationId={initialLocationId}
      stockRows={stockRows}
      catalogItems={catalogItems}
    />
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('inventar')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function InventarPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const t = await getTranslations('inventar')
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
      mainClassName="min-h-0"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight">{t('headline')}</h1>
        <Suspense fallback={<InventarSkeleton />}>
          <InventarData requestedLocationId={requestedLocationId} />
        </Suspense>
      </div>
    </AnalyticsPageShell>
  )
}
