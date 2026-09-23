import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CustomerPageShell } from '@/components/customer/customer-page-shell'

import { ProfileUserProfile } from '../_components/profile-user-profile'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile')
  const title = t('accountTitle')
  const description = t('accountDescription')
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function ProfileAccountPage() {
  const t = await getTranslations('profile')

  return (
    <CustomerPageShell maxWidth="lg">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('accountTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('accountDescription')}</p>
        <div className="pt-2">
          <ProfileUserProfile />
        </div>
      </div>
    </CustomerPageShell>
  )
}
