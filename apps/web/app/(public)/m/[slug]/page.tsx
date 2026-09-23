import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

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
    return {
      title,
      description: menu.tagline ?? t('metaDescription', { name: menu.name }),
      openGraph: {
        title,
        description: menu.tagline ?? t('metaDescription', { name: menu.name }),
      },
    }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

export default async function PublicLocationMenuPage({ params }: PageProps) {
  await connection()
  const t = await getTranslations('public.menu')
  const { slug } = await params
  const menu = await loadPublicLocationMenu(decodeURIComponent(slug))
  if (!menu) notFound()

  const currencyCode = (menu.currency?.trim() || getAppCurrencyCode()).toUpperCase()
  const locale = getCurrencyLocale(currencyCode)
  const hasItems = menu.categories.some((category) => category.items.length > 0)

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="relative flex min-h-[28vh] flex-col justify-end overflow-hidden px-6 pb-10 pt-16 sm:px-10 sm:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.92_0.02_80)_0%,_transparent_55%),linear-gradient(to_bottom,_oklch(0.97_0.01_80),_oklch(0.94_0.02_70))]"
        />
        <div className="relative z-10 mx-auto w-full max-w-2xl">
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-[0.2em] uppercase">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
            {menu.name}
          </h1>
          {menu.tagline ? (
            <p className="text-muted-foreground mt-3 max-w-xl text-lg text-pretty">
              {menu.tagline}
            </p>
          ) : null}
        </div>
      </header>

      <main id="menu-main" className="mx-auto w-full max-w-2xl px-6 pt-12 pb-20 sm:px-10 sm:pt-16">
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
                <ul className="divide-border divide-y">
                  {category.items.map((item) => (
                    <li
                      key={`${category.name}-${item.sortOrder}-${item.name}`}
                      className="flex items-baseline justify-between gap-4 py-3"
                    >
                      <span className="text-base font-medium tracking-tight">{item.name}</span>
                      <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                        {formatCurrency(item.price, currencyCode, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
