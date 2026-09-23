import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { CustomerPageShell } from '@/components/customer/customer-page-shell'
import { PwaInstallGuide } from '@/components/pwa/pwa-install-guide'
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

export default async function CustomerHomePage() {
  const { plan } = await getWorkspacePlanForUser()
  if (isProPlan(plan)) {
    redirect(routes.agent)
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

      <section
        aria-labelledby="customer-home-rewards-heading"
        className="rounded-lg border border-border bg-canvas/40 px-4 py-5 sm:px-5"
      >
        <h2
          id="customer-home-rewards-heading"
          className="text-base font-semibold tracking-tight"
        >
          {t('rewardsTitle')}
        </h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {t('rewardsLead')}
        </p>
      </section>

      <PwaInstallGuide headingId="guest-home-pwa-heading" />

      <div>
        <Button asChild className="min-h-11 w-full sm:w-auto" variant="outline">
          <Link href={routes.profile}>{t('profileCta')}</Link>
        </Button>
      </div>
    </CustomerPageShell>
  )
}
