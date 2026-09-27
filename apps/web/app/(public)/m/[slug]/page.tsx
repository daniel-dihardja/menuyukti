import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { getAppCurrencyCode } from '@/lib/app-currency'
import { formatCurrency, getCurrencyLocale } from '@/lib/currency'
import { loadPublicLocationMenu } from '@/lib/public-menu/load-public-menu'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.menu')
  const { slug } = await params
  try {
    const menu = await loadPublicLocationMenu(decodeURIComponent(slug))
    if (!menu) {
      return { title: t('notFoundTitle') }
    }
    const title = menu.tagline ? `${menu.name} · ${menu.tagline}` : menu.name
    const description = menu.tagline ?? t('metaDescription', { name: menu.name })
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(menu.headerImageUrl ? { images: [{ url: menu.headerImageUrl }] } : {}),
      },
    }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

const publicMenuShellClassName =
  "text-foreground min-h-screen bg-[#efeae2] bg-[url('/images/public-menu-wallpaper.svg')] bg-repeat bg-[length:360px_360px]"

function PublicMenuFallback() {
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

async function PublicLocationMenuContent({ params }: PageProps) {
  await connection()
  const t = await getTranslations('public.menu')
  const { slug } = await params
  const menu = await loadPublicLocationMenu(decodeURIComponent(slug))
  if (!menu) notFound()

  const currencyCode = (menu.currency?.trim() || getAppCurrencyCode()).toUpperCase()
  const locale = getCurrencyLocale(currencyCode)
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
          {menu.tagline ? (
            <p
              className={`mt-3 max-w-xl text-lg text-pretty ${
                hasHeaderImage ? 'text-white/85' : 'text-muted-foreground'
              }`}
            >
              {menu.tagline}
            </p>
          ) : null}
        </div>
      </header>

      <main id="menu-main" className="mx-auto w-full max-w-4xl px-6 pt-12 pb-20 sm:px-10 sm:pt-16">
        {!hasItems ? (
          <p className="text-muted-foreground py-12 text-center text-sm">{t('empty')}</p>
        ) : (
          <div className="flex flex-col gap-12">
            {menu.categories.map((category) => (
              <section
                key={category.name}
                aria-labelledby={`cat-${category.sortOrder}-${category.name}`}
              >
                <h2
                  id={`cat-${category.sortOrder}-${category.name}`}
                  className="mb-4 text-sm font-semibold tracking-wide uppercase"
                >
                  {category.name}
                </h2>
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {category.items.map((item) => {
                    const description = item.description.trim()
                    return (
                      <li
                        key={`${category.name}-${item.sortOrder}-${item.name}`}
                        className="bg-card text-card-foreground overflow-hidden rounded-xl border"
                      >
                        {item.imageUrl ? (
                          <div className="bg-muted aspect-[4/3] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="size-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ) : null}
                        <div className="flex flex-col gap-1.5 p-4">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="text-base font-medium tracking-tight">{item.name}</h3>
                            <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                              {formatCurrency(item.price, currencyCode, locale)}
                            </span>
                          </div>
                          {description ? (
                            <p className="text-muted-foreground line-clamp-3 text-sm text-pretty">
                              {description}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function PublicLocationMenuPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PublicMenuFallback />}>
      <PublicLocationMenuContent params={params} />
    </Suspense>
  )
}
