import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { cn } from '@workspace/ui/lib/utils'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'

import { StyleEditLoader } from './style-edit-loader'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('igStudio.styles')
  const title = t('editTitle')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function EditStylePage() {
  const t = await getTranslations('igStudio.styles')
  const tPosts = await getTranslations('posts')

  return (
    <AnalyticsPageShell
      title={t('editTitle')}
      breadcrumbs={[
        { label: tPosts('title'), href: routes.igStudio },
        { label: t('title'), href: routes.igStudioStyles },
        { label: t('editTitle') },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading title={t('editTitle')} description={t('description')} />
        <Suspense fallback={<p className="text-muted-foreground text-sm">{t('loading')}</p>}>
          <StyleEditLoader />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
