'use client'

import { Show } from '@clerk/nextjs'
import { Leaf, MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { AccountMenu } from '@/components/account/account-menu'
import { useCloseLabel } from '@/hooks/use-close-label'
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
  const closeLabel = useCloseLabel()
  const isLanding = pathname === '/'
  const isLogin = pathname === routes.login || (pathname?.startsWith(`${routes.login}/`) ?? false)
  const isSignUp =
    pathname === routes.signUp || (pathname?.startsWith(`${routes.signUp}/`) ?? false)
  /** Product links are for signed-in app areas; hide on marketing + auth screens. */
  const showProductNav = !isLanding && !isLogin && !isSignUp
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const workflowsActive =
    pathname === routes.workflows.list || pathname?.startsWith(`${routes.workflows.list}/`)
  const igStudioActive = pathname === routes.igStudio || pathname?.startsWith(`${routes.igStudio}/`)
  /** Only show the sheet when there are product links to list. */
  const showMobileMainMenu = showProductNav

  const navLinkClass = (active: boolean) =>
    cn(
      'rounded-none px-3 py-2 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
    )

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full shrink-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur-[16px]',
        isScrolled ? 'border-b border-border' : 'border-b border-transparent',
        'bg-canvas/72',
      )}
    >
      <div className="box-border flex h-14 w-full min-w-0 items-center justify-between gap-3 sm:gap-4">
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

          {showProductNav ? (
            <nav
              className="hidden min-w-0 flex-1 items-center justify-start gap-1 sm:flex sm:gap-2"
              aria-label={t('navAria')}
            >
              <Link href={routes.workflows.list} className={navLinkClass(workflowsActive)}>
                {t('navWorkflows')}
              </Link>
              <Link href={routes.igStudio} className={navLinkClass(igStudioActive)}>
                {t('navStudio')}
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
                  closeLabel={closeLabel}
                  className="flex flex-col gap-0 rounded-t-xl border-t px-0 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
                >
                  <SheetHeader className="flex flex-col gap-1 px-4 text-left">
                    <SheetTitle>{t('mobileMenuTitle')}</SheetTitle>
                    <SheetDescription>
                      {showProductNav
                        ? t('mobileMenuDescription')
                        : t('landingNav.mobileDescription')}
                    </SheetDescription>
                  </SheetHeader>
                  {showProductNav ? (
                    <nav aria-label={t('navAria')} className="flex flex-col gap-2 px-4 pt-4">
                      <SheetClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className={cn(
                            'h-auto min-h-11 w-full justify-start px-3 py-3 text-sm font-medium',
                            workflowsActive
                              ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <Link
                            href={routes.workflows.list}
                            aria-current={workflowsActive ? 'page' : undefined}
                          >
                            {t('navWorkflows')}
                          </Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className={cn(
                            'h-auto min-h-11 w-full justify-start px-3 py-3 text-sm font-medium',
                            igStudioActive
                              ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <Link
                            href={routes.igStudio}
                            aria-current={igStudioActive ? 'page' : undefined}
                          >
                            {t('navStudio')}
                          </Link>
                        </Button>
                      </SheetClose>
                    </nav>
                  ) : null}
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
            {showProductNav ? (
              <span className={cn(showMobileMainMenu && 'hidden sm:inline-flex')}>
                <Button asChild size="sm" variant="default">
                  <Link href={routes.login}>{t('mobileMenuSignIn')}</Link>
                </Button>
              </span>
            ) : null}
          </Show>
          <Show when="signed-in">
            <AccountMenu />
          </Show>
        </div>
      </div>
    </header>
  )
}
