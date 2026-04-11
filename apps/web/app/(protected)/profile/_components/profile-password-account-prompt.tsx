'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Card, CardFooter, CardHeader } from '@workspace/ui/components/card'

import { routes } from '@/lib/routes'

/** OAuth-only or no password: point users to Clerk account settings (single shared UI). */
export function ProfilePasswordAccountPrompt() {
  const t = useTranslations('profile')

  return (
    <Card className="max-w-md">
      <CardHeader>
        <h2 className="text-lg font-semibold tracking-tight">{t('passwordSectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('passwordOAuthOnly')}</p>
      </CardHeader>
      <CardFooter className="border-t pt-6">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={routes.profileAccount}>{t('passwordOpenAccountSettings')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
