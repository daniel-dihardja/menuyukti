import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PlaybookForm } from '@/app/(protected)/playbooks/_components/playbook-form'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
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

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const t = await getTranslations('playbooks')
  const overviewTitle = t(`items.${playbook.id}.title`)
  const title = t(`items.${playbook.id}.createTitle`)
  const description = t(`items.${playbook.id}.createDescription`)

  const data = await getCachedLocationsListData(userId)
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[
        { label: t('title'), href: routes.playbooks },
        { label: overviewTitle, href: routes.playbookDetail(playbook.slug) },
        { label: title },
      ]}
    >
      <div className="flex flex-col gap-6">
        <PageHeading title={title} description={description} />
        <PlaybookForm mode="create" branches={branches} catalog={playbook} />
      </div>
    </AnalyticsPageShell>
  )
}
