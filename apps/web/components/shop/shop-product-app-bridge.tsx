'use client'

import { Show } from '@clerk/nextjs'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'

import { routes } from '@/lib/routes'

export function ShopProductAppBridge() {
  const t = useTranslations('wayfinding.shopPdp')

  return (
    <div className="mt-10 rounded-lg border border-border bg-muted/30 px-4 py-4">
      <p className="text-sm font-semibold text-foreground">{t('title')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Show when="signed-in">
          <span className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild size="sm" variant="default">
              <Link href={routes.studio}>{t('openStudio')}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.workflows.list}>{t('openWorkflows')}</Link>
            </Button>
          </span>
        </Show>
        <Show when="signed-out">
          <Button asChild size="sm" variant="default">
            <Link href={routes.login}>{t('signInToContinue')}</Link>
          </Button>
        </Show>
      </div>
    </div>
  )
}
