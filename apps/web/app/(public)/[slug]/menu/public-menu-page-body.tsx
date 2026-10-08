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

import { PublicGuestShell } from '@/app/(public)/_components/public-guest-shell'

import { PublicMenuCatalog } from './public-menu-catalog'

export function PublicMenuFallback() {
  return (
    <PublicGuestShell>
      <header className="relative flex min-h-[28vh] flex-col justify-end overflow-hidden px-6 pb-10 pt-16 sm:px-10 sm:pb-12">
        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-2/3 max-w-md" />
          <Skeleton className="h-5 w-1/2 max-w-sm" />
        </div>
      </header>
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
      <header className="relative flex min-h-[28vh] flex-col justify-end overflow-hidden px-6 pb-10 pt-16 sm:px-10 sm:pb-12">
        {headerImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
            <img
              src={headerImageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
              decoding="async"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
            />
          </>
        ) : null}
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <p
            className={`mb-3 text-xs font-medium tracking-[0.2em] uppercase ${
              hasHeaderImage ? 'text-white/75' : 'text-muted-foreground'
            }`}
          >
            {t('eyebrow')}
          </p>
          <h1
            className={`font-heading text-4xl leading-tight tracking-tight text-pretty sm:text-5xl ${
              hasHeaderImage ? 'text-white' : ''
            }`}
          >
            {menu.name}
          </h1>
        </div>
      </header>

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
