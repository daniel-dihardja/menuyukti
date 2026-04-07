export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { getTranslations } from 'next-intl/server'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { AssetsClient } from '../assets/assets-client'

export default async function Page() {
  const t = await getTranslations('assets')
  const tStudio = await getTranslations('sidebar')
  const { userId } = await auth()
  if (!userId) {
    redirect(routes.login)
  }

  return (
    <AnalyticsPageShell
      title={tStudio('studio')}
      breadcrumbs={[{ label: tStudio('studio'), href: routes.studio }]}
    >
      <PageHeading title={tStudio('studio')} description={t('description')} />
      <AssetsClient />
    </AnalyticsPageShell>
  )
}
