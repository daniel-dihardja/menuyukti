import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { IgStoriesDynamic } from './ig-stories-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('igstories')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const tSidebar = await getTranslations('sidebar')
  const tIgStories = await getTranslations('igstories')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  return (
    <AnalyticsPageShell
      title={tIgStories('title')}
      breadcrumbs={[
        { label: tSidebar('media'), href: routes.media },
        { label: tSidebar('igStories'), href: routes.content.igStories },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <IgStoriesDynamic />
    </AnalyticsPageShell>
  )
}
