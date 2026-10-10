import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  BarChart3,
  Bot,
  CalendarClock,
  Coins,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  Vote,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { routes } from '@/lib/routes'

type NamedItem = {
  name: string
  description: string
}

type PillarItem = {
  title: string
  description: string
}

const bodyClass = 'text-pretty text-base leading-7 text-foreground'
const mutedBodyClass = 'text-pretty text-base leading-7 text-muted-foreground'
const sectionTitleClass = 'text-xl font-semibold tracking-tight text-foreground md:text-[1.375rem]'
const subsectionTitleClass = 'text-lg font-semibold tracking-tight text-foreground'
const emphasisClass = 'text-pretty text-base font-medium leading-7 tracking-tight text-foreground'
const labelClass = 'text-sm font-medium text-muted-foreground'

const platformCapabilityIcons = [ShoppingCart, Receipt, Package, Users, BarChart3] as const
const intelligenceIcons = [BarChart3, CalendarClock, Bot] as const

function ParagraphStack({
  paragraphs,
  className = bodyClass,
}: {
  paragraphs: ReadonlyArray<ReactNode>
  className?: string
}) {
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={className}>
          {paragraph}
        </p>
      ))}
    </div>
  )
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

export default async function AboutPage() {
  const t = await getTranslations('about')
  const pillars = t.raw('pillars') as PillarItem[]
  const platformCapabilities = t.raw('platformCapabilities') as string[]
  const votingExamples = t.raw('loyaltyVotingExamples') as string[]
  const loyaltyValueItems = t.raw('loyaltyValueItems') as string[]
  const insightsSteps = t.raw('insightsSteps') as string[]
  const intelligenceItems = t.raw('intelligenceItems') as NamedItem[]

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
            <p className={bodyClass}>{t('intro')}</p>
            <div className="space-y-2">
              <p className={emphasisClass}>{t('positioning')}</p>
              <p className={emphasisClass}>{t('tagline')}</p>
            </div>
            <p className={mutedBodyClass}>{t('distinction')}</p>
            <div className="space-y-3 pt-1">
              <p className={labelClass}>{t('pillarsLabel')}</p>
              <ol className="space-y-4">
                {pillars.map((pillar, index) => (
                  <li key={pillar.title} className="flex gap-3">
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold tabular-nums text-primary"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold tracking-tight text-foreground">{pillar.title}</p>
                      <p className={mutedBodyClass}>{pillar.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </header>

          <section className="space-y-4" aria-labelledby="about-platform-heading">
            <h2 id="about-platform-heading" className={sectionTitleClass}>
              {t('platformTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('platformBody'), t('platformBodyFollow')]} />
            <div className="space-y-3 pt-1">
              <p className={labelClass}>{t('platformCapabilitiesLabel')}</p>
              <ul className="grid gap-3 sm:grid-cols-1">
                {platformCapabilities.map((capability, index) => {
                  const Icon = platformCapabilityIcons[index] ?? Package
                  return (
                    <li
                      key={capability}
                      className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-foreground">{capability}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>

          <section
            className="space-y-5 rounded-2xl border border-primary/20 bg-muted/30 px-4 py-6 sm:px-5"
            aria-labelledby="about-loyalty-heading"
          >
            <h2 id="about-loyalty-heading" className={sectionTitleClass}>
              {t('loyaltyTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('loyaltyIntro'), t('loyaltyIntroFollow')]} />

            <div className="space-y-4">
              <p className={labelClass}>{t('loyaltyModulesLabel')}</p>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="size-4 text-primary" aria-hidden />
                    <h3 className={subsectionTitleClass}>{t('loyaltyPickAndWinTitle')}</h3>
                  </div>
                  <p className={bodyClass}>{t('loyaltyPickAndWinBody')}</p>
                  <p className={mutedBodyClass}>{t('loyaltyPickAndWinExample')}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Vote className="size-4 text-primary" aria-hidden />
                    <h3 className={subsectionTitleClass}>{t('loyaltyVotingTitle')}</h3>
                  </div>
                  <p className={bodyClass}>{t('loyaltyVotingBody')}</p>
                  <ul className="list-disc space-y-1 ps-5 text-pretty text-base leading-7 text-muted-foreground">
                    {votingExamples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className={emphasisClass}>{t('loyaltyModulesEmphasis')}</p>
            </div>

            <div className="space-y-3 border-t border-border/70 pt-5">
              <p className={labelClass}>{t('loyaltyValueTitle')}</p>
              <ul className="space-y-2">
                {loyaltyValueItems.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-pretty text-base leading-7 text-foreground"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="about-insights-heading">
            <h2 id="about-insights-heading" className={sectionTitleClass}>
              {t('insightsTitle')}
            </h2>
            <ParagraphStack
              paragraphs={[t('insightsBody'), t('insightsBodyFollow'), t('insightsBodyClose')]}
            />
            <div className="space-y-3 pt-1">
              <p className={labelClass}>{t('insightsStepsLabel')}</p>
              <ol className="grid gap-3 sm:grid-cols-2">
                {insightsSteps.map((step, index) => (
                  <li
                    key={step}
                    className="rounded-lg border border-border/70 bg-background/60 px-3 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-6 text-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="about-intelligence-heading">
            <h2 id="about-intelligence-heading" className={sectionTitleClass}>
              {t('intelligenceTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('intelligenceBody'), t('intelligenceBodyFollow')]} />
            <ul className="space-y-5 pt-1">
              {intelligenceItems.map((item, index) => {
                const Icon = intelligenceIcons[index] ?? BarChart3
                return (
                  <li key={item.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" aria-hidden />
                      <h3 className={subsectionTitleClass}>{item.name}</h3>
                    </div>
                    <p className={bodyClass}>{item.description}</p>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="space-y-4" aria-labelledby="about-modular-heading">
            <h2 id="about-modular-heading" className={sectionTitleClass}>
              {t('modularTitle')}
            </h2>
            <ParagraphStack
              paragraphs={[t('modularBody'), t('modularBodyFollow'), t('modularBodyClose')]}
            />
            <p className={mutedBodyClass}>{t('modularPricingNote')}</p>
          </section>

          <section className="space-y-4" aria-labelledby="about-why-heading">
            <h2 id="about-why-heading" className={sectionTitleClass}>
              {t('whyTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('whyBody'), t('whyBodyFollow'), t('whyBodyClose')]} />
          </section>

          <section
            className="space-y-5 border-t border-border/80 pt-10"
            aria-labelledby="about-cta-heading"
          >
            <h2 id="about-cta-heading" className={sectionTitleClass}>
              {t('ctaTitle')}
            </h2>
            <p className={bodyClass}>{t('ctaBody')}</p>
          </section>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
