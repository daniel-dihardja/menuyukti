import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { CreateLocationForm } from './create-location-form'
import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedLocationsData } from '@/lib/graphql/cached-queries'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'
import { isProPlan } from '@/lib/workspace-plan'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.branches')
  const title = t('create')
  const description = t('createDescription')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const t = await getTranslations('analytics.branches')
  const { userId } = await auth()
  const { plan } = await getWorkspacePlanForUser()
  if (userId && !isProPlan(plan)) {
    const data = await getCachedLocationsData(userId)
    if (data.locations.length >= 1) {
      redirect(routes.analytics.branches)
    }
  }

  return (
    <AnalyticsPageShell
      title={t('create')}
      breadcrumbs={[{ label: t('title'), href: routes.analytics.branches }, { label: t('create') }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={LOCATION_DETAIL_SECTION_CLASS}>
        <PageHeading title={t('create')} description={t('createDescription')} />
        <CreateLocationForm />
      </section>
    </AnalyticsPageShell>
  )
}
