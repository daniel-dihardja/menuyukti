import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { ReelsDynamic } from './reels-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reels')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const tSidebar = await getTranslations('sidebar')
  const tReels = await getTranslations('reels')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  return (
    <AnalyticsPageShell
      title={tReels('title')}
      breadcrumbs={[
        { label: tSidebar('content'), href: routes.content.photos },
        { label: tSidebar('igReels'), href: routes.content.reels },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <ReelsDynamic />
    </AnalyticsPageShell>
  )
}
