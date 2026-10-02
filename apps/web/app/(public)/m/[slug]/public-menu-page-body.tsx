import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { getAppCurrencyCode } from '@/lib/app-currency'
import { loadPublicLocationMenu } from '@/lib/public-menu/load-public-menu'

import { PublicMenuCatalog } from './public-menu-catalog'

export const publicMenuShellClassName =
  "text-foreground min-h-screen bg-[#efeae2] bg-[url('/images/public-menu-wallpaper.svg')] bg-repeat bg-[length:360px_360px]"

export function PublicMenuFallback() {
  return (
    <div className={publicMenuShellClassName}>
      <header className="relative flex min-h-[28vh] flex-col justify-end overflow-hidden px-6 pb-10 pt-16 sm:px-10 sm:pb-12">
        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-3">
          <div className="bg-muted h-3 w-24 animate-pulse rounded" />
          <div className="bg-muted h-10 w-2/3 max-w-md animate-pulse rounded" />
          <div className="bg-muted h-5 w-1/2 max-w-sm animate-pulse rounded" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 pt-12 pb-20 sm:px-10 sm:pt-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-muted h-40 animate-pulse rounded-xl" />
          ))}
        </div>
      </main>
    </div>
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
    <div className={publicMenuShellClassName}>
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
            className={`font-heading text-4xl leading-tight tracking-tight sm:text-5xl ${
              hasHeaderImage ? 'text-white' : ''
            }`}
          >
            {menu.name}
          </h1>
        </div>
      </header>

      <main id="menu-main" className="mx-auto w-full max-w-4xl px-6 pt-12 pb-20 sm:px-10 sm:pt-16">
        {!hasItems ? (
          <p className="text-muted-foreground py-12 text-center text-sm">{t('empty')}</p>
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
    </div>
  )
}
