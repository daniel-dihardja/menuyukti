import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { CreateLocationForm } from './create-location-form'
import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.branches')
  const title = t('create')
  const description = t('createDescription')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const t = await getTranslations('analytics.branches')

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
