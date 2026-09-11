import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { PLAYBOOK_CATALOG } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

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
          {PLAYBOOK_CATALOG.map((playbook) => (
            <li key={playbook.id}>
              <Card className="h-full gap-0 py-0">
                <CardHeader className="py-6">
                  <CardTitle>{t(`items.${playbook.id}.title`)}</CardTitle>
                  <CardDescription>{t(`items.${playbook.id}.description`)}</CardDescription>
                </CardHeader>
                <CardFooter className="border-t py-4">
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={routes.playbookDetail(playbook.slug)}>{t('start')}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsPageShell>
  )
}
