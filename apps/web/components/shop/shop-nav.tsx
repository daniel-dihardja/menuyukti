'use client'

import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import { ChevronLeft, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { menuyuktiClerkAppearance } from '@/components/clerk/menuyukti-appearance'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

export function ShopNav() {
  const t = useTranslations('shop.nav')
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminLinks = isLoaded && isMenuyuktiAdmin(role)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8 lg:px-12">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-6">
          <Link
            href={routes.shop}
            className="flex shrink-0 items-center gap-2 text-foreground transition-opacity hover:opacity-90"
            aria-label={t('brandAria')}
          >
            <UtensilsCrossed className="size-5 text-primary" aria-hidden />
            <span className="truncate text-sm font-semibold tracking-tight md:text-base">
              {t('brand')}
            </span>
          </Link>
          <p className="hidden max-w-[min(100%,20rem)] truncate text-xs text-muted-foreground sm:block md:text-sm">
            {t('tagline')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Show when="signed-in">
            <nav className="flex items-center gap-1 md:gap-2" aria-label={t('signedInNavAria')}>
              <Button variant="ghost" size="sm" className="hidden px-2 sm:inline-flex" asChild>
                <Link
                  href={routes.dashboard}
                  className="inline-flex items-center gap-1 text-sm font-medium"
                >
                  <ChevronLeft className="size-4 shrink-0 opacity-70" aria-hidden />
                  {t('backDashboard')}
                </Link>
              </Button>
              {showAdminLinks ? (
                <Button variant="ghost" size="sm" className="hidden px-2 lg:inline-flex" asChild>
                  <Link href={routes.printOrders}>{t('backPrintOrders')}</Link>
                </Button>
              ) : null}
              <UserButton appearance={menuyuktiClerkAppearance} />
            </nav>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" appearance={menuyuktiClerkAppearance}>
              <Button variant="outline" size="sm" type="button">
                {t('signIn')}
              </Button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </header>
  )
}
