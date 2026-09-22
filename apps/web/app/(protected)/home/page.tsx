import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
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

export default async function GuestHomePage() {
  const { plan } = await getWorkspacePlanForUser()
  if (isProPlan(plan)) {
    redirect(routes.agent)
  }

  const t = await getTranslations('guestHome')

  return (
    <AnalyticsPageShell
      mainClassName="gap-0 py-3 sm:py-4"
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 sm:max-w-2xl sm:gap-10">
        <div className="space-y-2">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">{t('headline')}</h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-sm">
            {t('lead')}
          </p>
        </div>

        <PwaInstallGuide headingId="guest-home-pwa-heading" />

        <div>
          <Button asChild className="min-h-11 w-full sm:w-auto" variant="outline">
            <Link href={routes.profile}>{t('profileCta')}</Link>
          </Button>
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
