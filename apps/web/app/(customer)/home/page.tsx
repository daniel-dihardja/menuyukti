import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { CustomerPointsSection } from '@/app/(customer)/home/_components/customer-points-section'
import { CustomerPointsSkeleton } from '@/app/(customer)/home/_components/customer-points-skeleton'
import { CustomerPageShell } from '@/components/customer/customer-page-shell'
import { PwaInstallGuide } from '@/components/pwa/pwa-install-guide'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_POINT_BALANCES_QUERY,
  MY_POINT_ENTRIES_QUERY,
  type MyPointBalancesData,
  type MyPointEntriesData,
} from '@/lib/graphql/queries/point-ledger'
import { routes } from '@/lib/routes'
import { isProPlan } from '@/lib/workspace-plan'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'
import { Button } from '@workspace/ui/components/button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('guestHome')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

async function CustomerPointsData() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return <CustomerPointsSection balances={[]} entries={[]} loadError />
  }

  try {
    const [balancesData, entriesData] = await Promise.all([
      graphqlQuery<MyPointBalancesData>(MY_POINT_BALANCES_QUERY, {}, userId, 'MyPointBalances'),
      graphqlQuery<MyPointEntriesData>(
        MY_POINT_ENTRIES_QUERY,
        { limit: 20 },
        userId,
        'MyPointEntries',
      ),
    ])
    return (
      <CustomerPointsSection
        balances={balancesData.myPointBalances}
        entries={entriesData.myPointEntries}
      />
    )
  } catch (error) {
    console.error('[customer/home] points', error)
    return <CustomerPointsSection balances={[]} entries={[]} loadError />
  }
}

export default async function CustomerHomePage() {
  const { plan } = await getWorkspacePlanForUser()
  if (isProPlan(plan)) {
    redirect(routes.analytics.branches)
  }

  const t = await getTranslations('guestHome')

  return (
    <CustomerPageShell>
      <div className="space-y-2">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('headline')}
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-sm">
          {t('lead')}
        </p>
      </div>

      <Suspense fallback={<CustomerPointsSkeleton />}>
        <CustomerPointsData />
      </Suspense>

      <PwaInstallGuide headingId="guest-home-pwa-heading" />

      <div>
        <Button asChild className="min-h-11 w-full sm:w-auto" variant="outline">
          <Link href={routes.profile}>{t('profileCta')}</Link>
        </Button>
      </div>
    </CustomerPageShell>
  )
}
