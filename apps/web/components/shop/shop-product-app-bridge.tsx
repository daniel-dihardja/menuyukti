'use client'

import { Show } from '@clerk/nextjs'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'

import { routes } from '@/lib/routes'

export function ShopProductAppBridge() {
  const t = useTranslations('wayfinding.shopPdp')

  return (
    <Show when="signed-out">
      <div className="mt-10 rounded-lg border border-border bg-muted/30 px-4 py-4">
        <Button asChild size="sm" variant="default">
          <Link href={routes.login}>{t('signInToContinue')}</Link>
        </Button>
      </div>
    </Show>
  )
}
