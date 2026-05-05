'use client'

import { Show } from '@clerk/nextjs'
import { Leaf, MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { AccountMenu } from '@/components/account/account-menu'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

export function MainHeader() {
  const pathname = usePathname()
  const t = useTranslations('mainHeader')

  const shopActive = pathname === routes.shop || pathname?.startsWith(`${routes.shop}/`)
  /** Keep product nav visible for guests on shop pages. */
  const hideGuestShopProductNav = false
  const showMobileMainMenu = !hideGuestShopProductNav

  const navLinkClass = (active: boolean) =>
    cn(
      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
    )

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border bg-background/95 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur supports-[backdrop-filter]:bg-background/80',
      )}
    >
      <div className="flex h-14 w-full min-w-0 items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap py-2 ps-3 text-foreground transition-opacity hover:opacity-90 sm:ps-4',
            )}
            aria-label={t('brandAria')}
          >
            <Leaf className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-semibold tracking-tight md:text-base">{t('brand')}</span>
          </Link>

          {!hideGuestShopProductNav ? (
            <nav
              className="hidden min-w-0 flex-1 items-center justify-start gap-1 sm:flex sm:gap-2"
              aria-label={t('navAria')}
            >
              <Link href={routes.studio} className={navLinkClass(false)}>
                {t('navWorkflows')}
              </Link>
              <Link href={routes.shop} className={navLinkClass(!!shopActive)}>
                {t('navShop')}
              </Link>
            </nav>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 pe-3 sm:pe-4">
          {showMobileMainMenu ? (
            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label={t('mobileMenuTriggerAria')}
                  >
                    <MenuIcon data-icon="inline-start" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="flex flex-col gap-0 rounded-t-xl border-t px-0 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
                >
                  <SheetHeader className="flex flex-col gap-1 px-4 text-left">
                    <SheetTitle>{t('mobileMenuTitle')}</SheetTitle>
                    <SheetDescription>{t('mobileMenuDescription')}</SheetDescription>
                  </SheetHeader>
                  <nav aria-label={t('navAria')} className="flex flex-col gap-2 px-4 pt-4">
                    <SheetClose asChild>
                      <Button
                        asChild
                        variant="ghost"
                        className={cn(
                          'h-auto min-h-11 w-full justify-start px-3 py-3 text-sm font-medium',
                          'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Link href={routes.studio}>{t('navWorkflows')}</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        asChild
                        variant="ghost"
                        className={cn(
                          'h-auto min-h-11 w-full justify-start px-3 py-3 text-sm font-medium',
                          shopActive
                            ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Link href={routes.shop} aria-current={shopActive ? 'page' : undefined}>
                          {t('navShop')}
                        </Link>
                      </Button>
                    </SheetClose>
                  </nav>
                  <Show when="signed-out">
                    <div className="px-4 pt-2">
                      <Separator className="mb-4" />
                      <SheetClose asChild>
                        <Button
                          asChild
                          variant="default"
                          className="h-11 w-full touch-manipulation"
                        >
                          <Link href={routes.login}>{t('mobileMenuSignIn')}</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  </Show>
                </SheetContent>
              </Sheet>
            </div>
          ) : null}
          <Show when="signed-out">
            <span className={cn(showMobileMainMenu && 'hidden sm:inline-flex')}>
              <Button asChild size="sm" variant="default">
                <Link href={routes.login}>{t('mobileMenuSignIn')}</Link>
              </Button>
            </span>
          </Show>
          <Show when="signed-in">
            <AccountMenu />
          </Show>
        </div>
      </div>
    </header>
  )
}
