import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'

import { DashboardPwaGuide } from './_components/dashboard-pwa-guide'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('platform.dashboard')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const t = await getTranslations('platform.dashboard')

  return (
    <AnalyticsPageShell
      mainClassName="gap-0 py-3 sm:py-4"
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 sm:max-w-2xl sm:gap-10">
        <div className="space-y-2">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">{t('headline')}</h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-sm">
            {t('lead')}
          </p>
        </div>

        <DashboardPwaGuide />
      </div>
    </AnalyticsPageShell>
  )
}
