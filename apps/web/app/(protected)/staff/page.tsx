import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('staff')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function StaffPage() {
  await requireMenuyuktiAdmin()

  const t = await getTranslations('staff')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>
    </AnalyticsPageShell>
  )
}
