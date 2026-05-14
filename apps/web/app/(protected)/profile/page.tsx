import { currentUser } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import Link from 'next/link'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

import { ProfileChangePasswordCard } from './_components/profile-change-password-card'
import { ProfileOverviewCard } from './_components/profile-overview-card'

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>

function getDisplayName(user: ClerkUser): string {
  const full = user.fullName?.trim()
  if (full) return full
  const first = user.firstName?.trim() ?? ''
  const last = user.lastName?.trim() ?? ''
  const combined = `${first} ${last}`.trim()
  if (combined) return combined
  if (user.username) return user.username
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return 'User'
}

function getPrimaryEmail(user: ClerkUser): string {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? ''
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile')
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function ProfilePage() {
  const user = await currentUser()
  if (!user) {
    redirect(routes.login)
  }

  const t = await getTranslations('profile')
  const name = getDisplayName(user)
  const email = getPrimaryEmail(user) || t('noEmail')
  const imageUrl = user.imageUrl
  const passwordEnabledFromServer = user.passwordEnabled === true

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('breadcrumb') }]}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
        <div className="flex flex-col gap-6 pt-4">
          <ProfileOverviewCard
            name={name}
            email={email}
            imageUrl={imageUrl}
            avatarAlt={t('avatarAlt', { name })}
          />
          <ProfileChangePasswordCard passwordEnabledFromServer={passwordEnabledFromServer} />
          <Link href={routes.profileTeam} className="block max-w-md">
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{t('teamLinkTitle')}</CardTitle>
                <CardDescription>{t('teamLinkDescription')}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
