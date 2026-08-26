import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getCachedInventoryCatalog } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { InventarCatalogClient } from './_components/inventar-catalog-client'

function CatalogSkeleton() {
  return <Skeleton className="h-48 w-full rounded-lg" />
}

async function CatalogData() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const workspaceData = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
  const workspaceIdRaw = workspaceData.myWorkspace?.id
  const workspaceId =
    workspaceIdRaw != null && Number.isInteger(Number(workspaceIdRaw)) && Number(workspaceIdRaw) > 0
      ? Number(workspaceIdRaw)
      : null

  if (workspaceId == null) {
    redirect(routes.inventar)
  }

  const catalogItems = await getCachedInventoryCatalog(userId, workspaceId)

  return <InventarCatalogClient workspaceId={workspaceId} catalogItems={catalogItems} />
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('inventar')
  const title = t('catalogTitle')
  const description = t('catalogDescription')
  return { title, description, openGraph: { title, description } }
}

export default async function InventarCatalogPage() {
  const t = await getTranslations('inventar')

  return (
    <AnalyticsPageShell
      title={t('catalogTitle')}
      breadcrumbs={[{ label: t('title'), href: routes.inventar }, { label: t('catalogTitle') }]}
      mainClassName="min-h-0"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight">{t('pantryItems')}</h1>
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogData />
        </Suspense>
      </div>
    </AnalyticsPageShell>
  )
}
