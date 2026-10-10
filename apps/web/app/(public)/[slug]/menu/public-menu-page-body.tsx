import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { UtensilsCrossed } from 'lucide-react'

import { getAppCurrencyCode } from '@/lib/app-currency'
import { loadPublicLocationMenu } from '@/lib/public-menu/load-public-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import { PublicGuestHeader, PublicGuestShell } from '@/app/(public)/_components/public-guest-shell'
import { PublicVenueHomeLink } from '@/app/(public)/_components/public-venue-home-link'

import { PublicMenuCatalog } from './public-menu-catalog'

export function PublicMenuFallback() {
  return (
    <PublicGuestShell>
      <PublicGuestHeader contentClassName="max-w-4xl">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-16" />
        </div>
      </PublicGuestHeader>
      <main className="mx-auto w-full max-w-4xl px-6 pt-12 pb-20 sm:px-10 sm:pt-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </main>
    </PublicGuestShell>
  )
}

type PublicLocationMenuBodyProps = {
  slug: string
  tableLabel: string | null
}

export async function PublicLocationMenuBody({ slug, tableLabel }: PublicLocationMenuBodyProps) {
  await connection()
  const t = await getTranslations('public.menu')
  const menu = await loadPublicLocationMenu(decodeURIComponent(slug))
  if (!menu) notFound()

  const currencyCode = (menu.currency?.trim() || getAppCurrencyCode()).toUpperCase()
  const hasItems = menu.categories.some((category) => category.items.length > 0)
  const headerImageUrl = menu.headerImageUrl
  const hasHeaderImage = Boolean(headerImageUrl)

  return (
    <PublicGuestShell>
      <PublicGuestHeader headerImageUrl={headerImageUrl} contentClassName="max-w-4xl">
        <p
          className={cn(
            'mb-3 text-xs font-medium tracking-[0.2em] uppercase',
            hasHeaderImage ? 'text-white/75' : 'text-muted-foreground',
          )}
        >
          {t('eyebrow')}
        </p>
        <PublicVenueHomeLink
          slug={menu.publicSlug}
          locationName={menu.name}
          hasHeaderImage={hasHeaderImage}
        />
      </PublicGuestHeader>

      <main id="menu-main" className="mx-auto w-full max-w-4xl px-6 pt-12 pb-20 sm:px-10 sm:pt-16">
        {!hasItems ? (
          <Empty className="border border-dashed py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UtensilsCrossed />
              </EmptyMedia>
              <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('empty')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PublicMenuCatalog
            locationId={menu.locationId}
            publicSlug={menu.publicSlug}
            categories={menu.categories}
            currencyCode={currencyCode}
            tableLabel={tableLabel}
          />
        )}
      </main>
    </PublicGuestShell>
  )
}
