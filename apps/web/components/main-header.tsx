'use client'

import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import { Leaf } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { menuyuktiClerkAppearance } from '@/components/clerk/menuyukti-appearance'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

export function MainHeader() {
  const pathname = usePathname()
  const t = useTranslations('mainHeader')

  const workflowsActive =
    pathname === routes.workflows.list || pathname?.startsWith(`${routes.workflows.list}/`)
  const shopActive = pathname === routes.shop || pathname?.startsWith(`${routes.shop}/`)

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
      <div className="flex h-14 w-full min-w-0 items-center gap-3 sm:gap-4">
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

        <nav
          className="flex min-w-0 flex-1 items-center justify-start gap-1 sm:gap-2"
          aria-label={t('navAria')}
        >
          <Link href={routes.workflows.list} className={navLinkClass(!!workflowsActive)}>
            {t('navWorkflows')}
          </Link>
          <Link href={routes.shop} className={navLinkClass(!!shopActive)}>
            {t('navShop')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 pe-3 sm:pe-4">
          <Show when="signed-out">
            <SignInButton />
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={menuyuktiClerkAppearance}
              userProfileMode="navigation"
              userProfileUrl={routes.profileAccount}
            />
          </Show>
        </div>
      </div>
    </header>
  )
}
