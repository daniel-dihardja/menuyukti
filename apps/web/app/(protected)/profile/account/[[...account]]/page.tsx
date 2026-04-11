import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { ProfileUserProfile } from '../_components/profile-user-profile'

export default async function ProfileAccountPage() {
  const t = await getTranslations('profile')

  return (
    <AnalyticsPageShell
      title={t('accountTitle')}
      breadcrumbs={[
        { label: t('breadcrumb'), href: routes.profile },
        { label: t('accountBreadcrumb') },
      ]}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('accountTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('accountDescription')}</p>
        <div className="pt-2">
          <ProfileUserProfile />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
