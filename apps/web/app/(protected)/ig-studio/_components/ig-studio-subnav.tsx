'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import { routes } from '@/lib/routes'

export function IgStudioSubnav() {
  const t = useTranslations('igStudio.subnav')
  const pathname = usePathname()

  const items = [
    {
      href: routes.igStudio,
      label: t('posts'),
      active: pathname === routes.igStudio || /^\/ig-studio\/\d+/.test(pathname ?? ''),
    },
    {
      href: routes.igStudioStyles,
      label: t('styles'),
      active:
        pathname === routes.igStudioStyles || pathname?.startsWith(`${routes.igStudioStyles}/`),
    },
  ]

  return (
    <nav aria-label={t('ariaLabel')} className="flex gap-1 border-b border-border/60 pb-px">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            item.active
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
