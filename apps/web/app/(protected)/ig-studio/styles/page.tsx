import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ImagePlus, Plus } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'

import { StylesLibrary } from './_components/styles-library'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('igStudio.styles')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function StylesPage() {
  const t = await getTranslations('igStudio.styles')
  const tPosts = await getTranslations('posts')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[
        { label: tPosts('title'), href: routes.igStudio },
        { label: t('title'), href: routes.igStudioStyles },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeading title={t('title')} description={t('description')} />
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={routes.igStudioStyleNew}>
                <ImagePlus className="size-4" aria-hidden />
                {t('createFromImage')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={routes.igStudioStyleNew}>
                <Plus className="size-4" aria-hidden />
                {t('add')}
              </Link>
            </Button>
          </div>
        </div>
        <Suspense fallback={<p className="text-muted-foreground text-sm">{t('loading')}</p>}>
          <StylesLibrary />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
