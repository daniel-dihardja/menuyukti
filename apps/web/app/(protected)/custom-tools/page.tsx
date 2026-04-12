import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { CustomToolsData } from '@/app/(protected)/custom-tools/_components/custom-tools-data'
import { CustomToolsManager } from '@/app/(protected)/custom-tools/_components/custom-tools-manager'
import { CustomToolsSkeleton } from '@/app/(protected)/custom-tools/_components/custom-tools-skeleton'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
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

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: tDash('title'), href: routes.dashboard }, { label: t('title') }]}
    >
      <PageHeading description={t('description')} title={t('title')} />
      {!userId ? (
        <CustomToolsManager initialTools={[]} workspaceId={null} workspaceName={null} />
      ) : (
        <Suspense fallback={<CustomToolsSkeleton />}>
          <CustomToolsData userId={userId} />
        </Suspense>
      )}
    </AnalyticsPageShell>
  )
}
