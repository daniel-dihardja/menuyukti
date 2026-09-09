import { BookOpen } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getPlaybookBySlug } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'

type PlaybookOverviewPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlaybookOverviewPageProps): Promise<Metadata> {
  const { slug } = await params
  const playbook = getPlaybookBySlug(slug)
  if (!playbook) {
    return {}
  }

  const t = await getTranslations('playbooks')
  const title = t(`items.${playbook.id}.title`)
  const description = t(`items.${playbook.id}.description`)
  return { title, description, openGraph: { title, description } }
}

export default async function PlaybookOverviewPage({ params }: PlaybookOverviewPageProps) {
  const { slug } = await params
  const playbook = getPlaybookBySlug(slug)
  if (!playbook) {
    notFound()
  }

  const t = await getTranslations('playbooks')
  const title = t(`items.${playbook.id}.title`)
  const description = t(`items.${playbook.id}.description`)
  const isEmpty = true

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: t('title'), href: routes.playbooks }, { label: title }]}
    >
      <div className="flex flex-col gap-6">
        <PageHeading title={title} description={isEmpty ? undefined : description} />
        {isEmpty ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t(`items.${playbook.id}.emptyTitle`)}</EmptyTitle>
              <EmptyDescription>{t(`items.${playbook.id}.emptyDescription`)}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={routes.playbookNew(playbook.slug)}>{t('createPlaybook')}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
      </div>
    </AnalyticsPageShell>
  )
}
