import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getPlaybookBySlug } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'

type PlaybookDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlaybookDetailPageProps): Promise<Metadata> {
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

export default async function PlaybookDetailPage({ params }: PlaybookDetailPageProps) {
  const { slug } = await params
  const playbook = getPlaybookBySlug(slug)
  if (!playbook) {
    notFound()
  }

  const t = await getTranslations('playbooks')
  const title = t(`items.${playbook.id}.title`)
  const description = t(`items.${playbook.id}.description`)

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: t('title'), href: routes.playbooks }, { label: title }]}
    >
      <PageHeading title={title} description={description} />
    </AnalyticsPageShell>
  )
}
