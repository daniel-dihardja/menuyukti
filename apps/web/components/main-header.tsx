'use client'

import { Show } from '@clerk/nextjs'
import { Leaf } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { AccountMenu } from '@/components/account/account-menu'
import { GuestSignInMenu } from '@/components/guest-sign-in-menu'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

export function MainHeader() {
  const pathname = usePathname()
  const t = useTranslations('mainHeader')
  const isLogin = pathname === routes.login || (pathname?.startsWith(`${routes.login}/`) ?? false)
  const isSignUp =
    pathname === routes.signUp || (pathname?.startsWith(`${routes.signUp}/`) ?? false)
  const isAbout = pathname === routes.about || (pathname?.startsWith(`${routes.about}/`) ?? false)
  /** Hide sign-in chrome on auth pages (user is already signing in / up). */
  const showSignIn = !isLogin && !isSignUp
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

          <nav aria-label={t('navAria')} className="flex min-w-0 items-center gap-1">
            <Link
              href={routes.about}
              aria-current={isAbout ? 'page' : undefined}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                isAbout ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('navAbout')}
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 pe-3 sm:pe-4">
          <Show when="signed-out">{showSignIn ? <GuestSignInMenu /> : null}</Show>
          <Show when="signed-in">
            <AccountMenu />
          </Show>
        </div>
      </div>
    </header>
  )
}
