import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { Button } from '@workspace/ui/components/button'

import { SiteFooter } from '@/components/site-footer'
import { getLandingSampleMenu } from '@/lib/landing/sample-menu'
import { routes } from '@/lib/routes'

const bodyClass = 'text-pretty text-base leading-7 text-foreground'
const sectionTitleClass = 'text-xl font-semibold tracking-tight text-foreground md:text-[1.375rem]'
const emphasisClass = 'text-pretty text-base font-medium leading-7 tracking-tight text-foreground'

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

function AboutCtas({
  primaryLabel,
  secondaryLabel,
  sampleMenuPath,
}: {
  primaryLabel: string
  secondaryLabel: string
  sampleMenuPath: string | null
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button asChild>
        <Link href={routes.login}>{primaryLabel}</Link>
      </Button>
      {sampleMenuPath ? (
        <Button asChild variant="outline">
          <Link href={sampleMenuPath}>{secondaryLabel}</Link>
        </Button>
      ) : null}
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
  const sampleMenu = getLandingSampleMenu()
  const sampleMenuPath = sampleMenu?.path ?? null

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
            <AboutCtas
              primaryLabel={t('ctaPrimary')}
              secondaryLabel={t('ctaSecondary')}
              sampleMenuPath={sampleMenuPath}
            />
          </header>

          <section
            className="space-y-5 rounded-2xl border border-primary/20 bg-muted/30 px-4 py-6 sm:px-5"
            aria-labelledby="about-presence-heading"
          >
            <h2 id="about-presence-heading" className={sectionTitleClass}>
              {t('presenceTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('presenceBody'), t('presenceBodyFollow')]} />
          </section>

          <section className="space-y-4" aria-labelledby="about-howto-heading">
            <h2 id="about-howto-heading" className={sectionTitleClass}>
              {t('howtoTitle')}
            </h2>
            <ol className={`list-decimal space-y-3 pl-5 ${bodyClass}`}>
              <li>{t('howtoStep1')}</li>
              <li>{t('howtoStep2')}</li>
              <li>{t('howtoStep3')}</li>
            </ol>
          </section>

          <section className="space-y-4" aria-labelledby="about-benefit-heading">
            <h2 id="about-benefit-heading" className={sectionTitleClass}>
              {t('benefitTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('benefitBody')]} />
            <p className={emphasisClass}>{t('benefitEmphasis')}</p>
          </section>

          <section className="space-y-4" aria-labelledby="about-platform-heading">
            <h2 id="about-platform-heading" className={sectionTitleClass}>
              {t('platformTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('platformBody'), t('platformBodyFollow')]} />
          </section>

          <section
            className="space-y-5 border-t border-border/80 pt-10"
            aria-labelledby="about-closing-heading"
          >
            <h2 id="about-closing-heading" className={sectionTitleClass}>
              {t('closingTitle')}
            </h2>
            <ParagraphStack paragraphs={[t('closingBody')]} />
            <p className={emphasisClass}>{t('closingTagline')}</p>
            <AboutCtas
              primaryLabel={t('ctaPrimary')}
              secondaryLabel={t('ctaSecondary')}
              sampleMenuPath={sampleMenuPath}
            />
          </section>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
