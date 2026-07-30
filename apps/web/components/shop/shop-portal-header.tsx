'use client'

import { Show } from '@clerk/nextjs'
import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

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
import { cn } from '@workspace/ui/lib/utils'

import { routes } from '@/lib/routes'

export function ShopPortalHeader() {
  const pathname = usePathname()
  const t = useTranslations('shop.nav')
  const tMain = useTranslations('mainHeader')

  const shopActive = pathname === routes.shop || pathname?.startsWith(`${routes.shop}/`)

  const workspaceLinks = [
    { href: routes.dashboard, label: t('backDashboard') },
    { href: routes.agent, label: t('backChat') },
    { href: routes.igStudio, label: t('backStudio') },
  ] as const

  const productLinks = [
    { href: routes.agent, label: tMain('navChat'), active: false },
    { href: routes.igStudio, label: tMain('navStudio'), active: false },
    { href: routes.shop, label: tMain('navShop'), active: shopActive },
  ] as const

  return (
    <Show when="signed-in">
      <header
        className={cn(
          'border-b border-border bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80',
        )}
      >
        <div className="shop-horizontal-padding-x mx-auto flex min-h-12 max-w-[1440px] items-center justify-end gap-3 py-2">
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={t('navigationMenuTriggerAria')}
                >
                  <MenuIcon data-icon="inline-start" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="flex flex-col gap-0 rounded-t-xl border-t px-0 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
                <SheetHeader className="flex flex-col gap-1 px-4 text-left">
                  <SheetTitle>{t('shopMenuTitle')}</SheetTitle>
                  <SheetDescription>{t('shopMenuDescription')}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pt-4">
                  <nav aria-label={tMain('navAria')} className="flex flex-col gap-2">
                    {productLinks.map(({ href, label, active }) => (
                      <SheetClose key={href} asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className={cn(
                            'h-auto min-h-11 w-full justify-start px-3 py-3 text-sm font-medium',
                            active
                              ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <Link href={href} aria-current={active ? 'page' : undefined}>
                            {label}
                          </Link>
                        </Button>
                      </SheetClose>
                    ))}
                  </nav>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <p
                      className="text-muted-foreground text-sm font-medium"
                      id="shop-portal-workspace-heading"
                    >
                      {t('workspaceSectionHeading')}
                    </p>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {t('workspaceMenuDescription')}
                    </p>
                  </div>
                  <nav
                    aria-labelledby="shop-portal-workspace-heading"
                    className="flex flex-col gap-2"
                  >
                    {workspaceLinks.map(({ href, label }) => (
                      <SheetClose key={href} asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className="h-auto min-h-11 w-full justify-start px-3 py-3 text-muted-foreground hover:text-foreground"
                        >
                          <Link href={href}>{label}</Link>
                        </Button>
                      </SheetClose>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <nav
            aria-label={t('signedInNavAria')}
            className="hidden max-w-full items-center justify-end gap-x-1 sm:flex sm:gap-x-2"
          >
            {workspaceLinks.map(({ href, label }) => (
              <Button
                key={href}
                asChild
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>
    </Show>
  )
}
