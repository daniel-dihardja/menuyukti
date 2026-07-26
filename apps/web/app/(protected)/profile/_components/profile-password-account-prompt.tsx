'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'

import { routes } from '@/lib/routes'

/** OAuth-only or no password: point users to Clerk account settings (single shared UI). */
export function ProfilePasswordAccountPrompt() {
  const t = useTranslations('profile')

  return (
    <section className="max-w-md space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">{t('passwordSectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('passwordOAuthOnly')}</p>
      </div>
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link href={routes.profileAccount}>{t('passwordOpenAccountSettings')}</Link>
      </Button>
    </section>
  )
}
