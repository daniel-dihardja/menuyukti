'use client'

import { Show } from '@clerk/nextjs'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { routes } from '@/lib/routes'

export function ShopPortalHeader() {
  const t = useTranslations('shop.nav')

  return (
    <Show when="signed-in">
      <header
        className={cn(
          'border-b border-border bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80',
        )}
      >
        <div className="shop-horizontal-padding-x mx-auto flex min-h-12 max-w-[1440px] flex-wrap items-center justify-end gap-3 py-2">
          <nav
            aria-label={t('signedInNavAria')}
            className="flex max-w-full flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:gap-x-2"
          >
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <Link href={routes.dashboard}>{t('backDashboard')}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <Link href={routes.workflows.list}>{t('backWorkflows')}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <Link href={routes.studio}>{t('backStudio')}</Link>
            </Button>
          </nav>
        </div>
      </header>
    </Show>
  )
}
