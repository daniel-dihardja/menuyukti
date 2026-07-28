import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { graphqlQuery } from '@/lib/graphql/client'
import { CRM_APP_QUERY, type CrmAppData } from '@/lib/graphql/queries/crm-apps'
import { routes } from '@/lib/routes'

import { AppDetailClient } from './_components/app-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const id = Number(rawId)
  const t = await getTranslations('platform.crm.apps')

  if (!Number.isInteger(id) || id <= 0) {
    return { title: t('detail.title') }
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('detail.title') }
  }

  const data = await graphqlQuery<CrmAppData>(CRM_APP_QUERY, { id }, userId)
  const title = data.crmApp?.title ?? t('detail.title')
  const description = t('detail.description')
  return { title, description, openGraph: { title, description } }
}

export default async function CrmAppDetailPage({ params }: PageProps) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    notFound()
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await graphqlQuery<CrmAppData>(CRM_APP_QUERY, { id }, userId)
  if (!data.crmApp) {
    notFound()
  }

  const t = await getTranslations('platform.crm')
  const tApps = await getTranslations('platform.crm.apps')
  const app = data.crmApp

  return (
    <AnalyticsPageShell
      title={app.title}
      breadcrumbs={[
        { label: t('breadcrumb'), href: routes.crm },
        { label: tApps('breadcrumb'), href: routes.crmApps },
        { label: app.title },
      ]}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{app.title}</h1>
        <p className="text-sm text-muted-foreground">{tApps('detail.description')}</p>
        <div className="pt-4">
          <AppDetailClient initialApp={app} />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
