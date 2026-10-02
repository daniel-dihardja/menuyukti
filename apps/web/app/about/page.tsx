import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { routes } from '@/lib/routes'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about')
  const title = t('metaTitle')
  const description = t('metaDescription')

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: routes.about,
    },
    openGraph: {
      title,
      description,
      url: routes.about,
      siteName: 'Menuyukti',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

function StackList({ items }: { items: ReadonlyArray<{ name: string; price: string }> }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.name}
          className="flex items-baseline justify-between gap-4 text-pretty leading-relaxed text-foreground/90"
        >
          <span className="min-w-0">→ {item.name}</span>
          <span className="shrink-0 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {item.price}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default async function AboutPage() {
  const t = await getTranslations('about')
  const problemItems = t.raw('problemItems') as string[]
  const coreItems = t.raw('coreItems') as Array<{ name: string; price: string }>
  const addonItems = t.raw('addonItems') as Array<{ name: string; price: string }>
  const serviceItems = t.raw('serviceItems') as Array<{ name: string; price: string }>

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
      <div className="pointer-events-none absolute inset-0 landing-atmosphere" aria-hidden />
      <div className="relative mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:py-16">
        <article className="space-y-10">
          <header className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
            <p className="text-pretty text-lg leading-relaxed text-foreground/90">{t('intro')}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('problemTitle')}</h2>
            <ul className="space-y-2 text-pretty leading-relaxed text-foreground/90">
              {problemItems.map((item) => (
                <li key={item}>→ {item}</li>
              ))}
            </ul>
            <p className="text-pretty leading-relaxed text-muted-foreground">{t('problemClose')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('whyTitle')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">{t('whyBody')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('solutionTitle')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">{t('solutionBody')}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('costTitle')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">{t('costBody')}</p>
          </section>

          <section className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{t('stackTitle')}</h2>
              <StackList items={coreItems} />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('addonsTitle')}</h3>
              <StackList items={addonItems} />
              <p className="text-sm text-muted-foreground">{t('addonsMore')}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('servicesTitle')}</h3>
              <StackList items={serviceItems} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-pretty leading-relaxed text-foreground/90">{t('flexibility')}</p>
          </section>

          <section className="space-y-3 border-t border-border pt-8">
            <h2 className="text-xl font-semibold">{t('goalTitle')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">{t('goalBody')}</p>
            <p className="text-pretty text-lg font-medium tracking-tight">{t('tagline')}</p>
          </section>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
