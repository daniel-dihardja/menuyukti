import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

const PLAYBOOK_ITEM_IDS = ['publicHolidays'] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('playbooks')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function PlaybooksPage() {
  const t = await getTranslations('playbooks')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <div className="flex flex-col gap-6">
        <PageHeading title={t('title')} description={t('description')} />
        <ul aria-label={t('catalogAria')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYBOOK_ITEM_IDS.map((id) => (
            <li key={id}>
              <Card className="h-full py-0">
                <CardHeader className="py-6">
                  <CardTitle>{t(`items.${id}.title`)}</CardTitle>
                  <CardDescription>{t(`items.${id}.description`)}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsPageShell>
  )
}
