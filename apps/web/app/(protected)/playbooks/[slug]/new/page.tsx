import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getPlaybookBySlug } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'

type PlaybookInstancePageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlaybookInstancePageProps): Promise<Metadata> {
  const { slug } = await params
  const playbook = getPlaybookBySlug(slug)
  if (!playbook) {
    return {}
  }

  const t = await getTranslations('playbooks')
  const title = t(`items.${playbook.id}.createTitle`)
  const description = t(`items.${playbook.id}.createDescription`)
  return { title, description, openGraph: { title, description } }
}

export default async function PlaybookInstanceNewPage({ params }: PlaybookInstancePageProps) {
  const { slug } = await params
  const playbook = getPlaybookBySlug(slug)
  if (!playbook) {
    notFound()
  }

  const t = await getTranslations('playbooks')
  const overviewTitle = t(`items.${playbook.id}.title`)
  const title = t(`items.${playbook.id}.createTitle`)
  const description = t(`items.${playbook.id}.createDescription`)

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[
        { label: t('title'), href: routes.playbooks },
        { label: overviewTitle, href: routes.playbookDetail(playbook.slug) },
        { label: title },
      ]}
    >
      <PageHeading title={title} description={description} />
    </AnalyticsPageShell>
  )
}
