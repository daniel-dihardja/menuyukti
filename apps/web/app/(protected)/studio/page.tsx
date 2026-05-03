import { getTranslations } from 'next-intl/server'
import { auth } from '@clerk/nextjs/server'

import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'

import { StudioAssetsDynamic } from './studio-assets-dynamic'

export default async function Page() {
  const tStudio = await getTranslations('sidebar')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  return (
    <AnalyticsPageShell
      title={tStudio('studio')}
      breadcrumbs={[{ label: tStudio('studio'), href: routes.studio }]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <StudioAssetsDynamic />
    </AnalyticsPageShell>
  )
}
