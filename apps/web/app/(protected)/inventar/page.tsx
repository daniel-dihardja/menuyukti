import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('inventar')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function InventarPage() {
  const t = await getTranslations('inventar')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 sm:max-w-2xl">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight">{t('headline')}</h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-sm">
          {t('empty')}
        </p>
      </div>
    </AnalyticsPageShell>
  )
}
