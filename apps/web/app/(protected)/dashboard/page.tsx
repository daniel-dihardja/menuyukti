import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

import { DashboardPwaGuide } from './_components/dashboard-pwa-guide'

export default async function Page() {
  const t = await getTranslations('platform.dashboard')

  return (
    <AnalyticsPageShell
      mainClassName="gap-0 py-3 sm:py-4"
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 sm:max-w-2xl sm:gap-6">
        <Card className="gap-3 py-5 shadow-sm sm:gap-4 sm:py-6">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-pretty text-xl tracking-tight sm:text-2xl">
              {t('headline')}
            </CardTitle>
            <CardDescription className="text-pretty text-base leading-relaxed sm:text-sm">
              {t('lead')}
            </CardDescription>
          </CardHeader>
        </Card>

        <DashboardPwaGuide />
      </div>
    </AnalyticsPageShell>
  )
}
