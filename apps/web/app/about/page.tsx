import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { Badge } from '@workspace/ui/components/badge'

import { SiteFooter } from '@/components/site-footer'
import { routes } from '@/lib/routes'

type FeatureItem = {
  name: string
  price?: string
  paragraphs: string[]
  emphasis?: string
}

const bodyClass = 'text-pretty text-base leading-7 text-foreground'
const sectionTitleClass = 'text-xl font-semibold tracking-tight text-foreground md:text-[1.375rem]'
const subsectionTitleClass = 'text-lg font-semibold tracking-tight text-foreground'
const emphasisClass = 'text-pretty text-base font-medium leading-7 tracking-tight text-foreground'

const richStrong = {
  strong: (chunks: ReactNode) => <strong className="font-semibold">{chunks}</strong>,
}

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

function ParagraphStack({ paragraphs }: { paragraphs: ReadonlyArray<ReactNode> }) {
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={bodyClass}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function FeatureList({ items }: { items: ReadonlyArray<FeatureItem> }) {
  return (
    <ul className="space-y-8">
      {items.map((item) => (
        <li key={item.name} className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className={subsectionTitleClass}>{item.name}</h3>
            {item.price ? (
              <Badge
                variant="default"
                className="shrink-0 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider"
              >
                {item.price}
              </Badge>
            ) : null}
          </div>
          <ParagraphStack paragraphs={item.paragraphs} />
          {item.emphasis ? <p className={emphasisClass}>{item.emphasis}</p> : null}
        </li>
      ))}
    </ul>
  )
}

export default async function AboutPage() {
  const t = await getTranslations('about')
  const coreItems = t.raw('coreItems') as FeatureItem[]
  const addonItems = t.raw('addonItems') as FeatureItem[]
  const serviceItems = t.raw('serviceItems') as FeatureItem[]
  const growItems = t.raw('growItems') as string[]

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-light opacity-25" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 landing-atmosphere opacity-50"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[35rem] flex-1 px-6 py-12 md:py-16">
        <div
          className="pointer-events-none absolute -inset-x-2 inset-y-4 rounded-[1.75rem] bg-background/90 sm:-inset-x-8 sm:inset-y-6"
          aria-hidden
        />
        <article className="relative space-y-12 md:space-y-14">
          <header className="space-y-5">
            <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              {t('title')}
            </h1>
            <ParagraphStack paragraphs={[t('intro'), t('introFollow'), t('introClose')]} />
            <p className={emphasisClass}>{t('heroTagline')}</p>
          </header>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>{t('fragmentedTitle')}</h2>
            <ParagraphStack
              paragraphs={[
                t('fragmentedBody'),
                t('fragmentedBodyFollow'),
                t('fragmentedBodyClose'),
                t('fragmentedBodyApproach'),
              ]}
            />
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>{t('foundationTitle')}</h2>
            <ParagraphStack
              paragraphs={[
                t('foundationBody'),
                t.rich('foundationBodyWhy', richStrong),
                t('foundationBodyOps'),
                t('foundationBodyMenu'),
                t('foundationBodyClose'),
              ]}
            />
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>{t('modularTitle')}</h2>
            <ParagraphStack
              paragraphs={[
                t('modularBody'),
                t('modularBodyFollow'),
                t('modularBodyWhy'),
                t('modularBodyHow'),
                t.rich('modularBodyClose', richStrong),
              ]}
            />
          </section>

          <section className="space-y-6">
            <h2 className={sectionTitleClass}>{t('coreTitle')}</h2>
            <FeatureList items={coreItems} />
          </section>

          <section className="space-y-6">
            <h2 className={sectionTitleClass}>{t('addonsTitle')}</h2>
            <FeatureList items={addonItems} />
            <p className="text-sm leading-6 text-muted-foreground">{t('addonsMore')}</p>
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>{t('guestTitle')}</h2>
            <ParagraphStack
              paragraphs={[
                t('guestBody'),
                t('guestBodyMenu'),
                t('guestBodySignIn'),
                t('guestBodyInstall'),
              ]}
            />
          </section>

          <section className="space-y-6">
            <div className="space-y-4">
              <h2 className={sectionTitleClass}>{t('servicesIntroTitle')}</h2>
              <ParagraphStack paragraphs={[t('servicesIntroBody'), t('servicesIntroFollow')]} />
            </div>
            <FeatureList items={serviceItems} />
            <p className={bodyClass}>{t('servicesClose')}</p>
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>{t('costTitle')}</h2>
            <ParagraphStack paragraphs={[t('costBody'), t('costBodyFollow'), t('costBodyNot')]} />
            <p className={emphasisClass}>{t('costBodyGoal')}</p>
            <p className={bodyClass}>{t('costBodyCore')}</p>
          </section>

          <section className="space-y-4 border-t border-border/80 pt-10">
            <h2 className={sectionTitleClass}>{t('growTitle')}</h2>
            <ParagraphStack paragraphs={growItems} />
            <p className={bodyClass}>{t('growBody')}</p>
            <p className={emphasisClass}>{t('growEmphasis')}</p>
            <p className={emphasisClass}>{t('tagline')}</p>
          </section>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
