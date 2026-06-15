import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { Bot, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { HeroProductPreview } from '@/app/_components/landing/hero-product-preview'
import { LandingBento } from '@/app/_components/landing/landing-bento'
import { LandingFaq } from '@/app/_components/landing/landing-faq'
import { LandingFeatureSpotlight } from '@/app/_components/landing/landing-feature-spotlight'
import { LandingFooter } from '@/app/_components/landing/landing-footer'
import {
  LandingHeroHeadline,
  parseLandingHeroHeadlineVariant,
} from '@/app/_components/landing/landing-hero-headline'
import { LandingServicesGrid } from '@/app/_components/landing/landing-services-grid'
import { LandingTrustStrip } from '@/app/_components/landing/landing-trust-strip'
import { routes } from '@/lib/routes'

type LandingPageProps = {
  searchParams: Promise<{ heroHeadline?: string | string[] }>
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const t = await getTranslations('landing')
  const heroHeadlineVariant = parseLandingHeroHeadlineVariant((await searchParams).heroHeadline)

  const whyItems = [
    {
      title: t('why.item1Title'),
      description: t('why.item1Description'),
    },
    {
      title: t('why.item2Title'),
      description: t('why.item2Description'),
    },
    {
      title: t('why.item3Title'),
      description: t('why.item3Description'),
    },
  ] as const

  const foundationItems = [
    {
      title: t('foundation.item1Title'),
      description: t('foundation.item1Description'),
    },
    {
      title: t('foundation.item2Title'),
      description: t('foundation.item2Description'),
    },
    {
      title: t('foundation.item3Title'),
      description: t('foundation.item3Description'),
    },
  ] as const

  const differentiatorItems = t.raw('differentiators.items') as Array<{
    value: string
    label: string
  }>

  const serviceItems = [
    {
      id: 'analysis',
      title: t('services.items.analysis.title'),
      description: t('services.items.analysis.description'),
      bullets: t.raw('services.items.analysis.bullets') as string[],
    },
    {
      id: 'content',
      title: t('services.items.content.title'),
      description: t('services.items.content.description'),
      bullets: t.raw('services.items.content.bullets') as string[],
    },
    {
      id: 'social',
      title: t('services.items.social.title'),
      description: t('services.items.social.description'),
      bullets: t.raw('services.items.social.bullets') as string[],
    },
    {
      id: 'strategy',
      title: t('services.items.strategy.title'),
      description: t('services.items.strategy.description'),
      bullets: t.raw('services.items.strategy.bullets') as string[],
    },
    {
      id: 'technical',
      title: t('services.items.technical.title'),
      description: t('services.items.technical.description'),
      bullets: t.raw('services.items.technical.bullets') as string[],
    },
  ] as const

  const platformSlides = [
    {
      id: 'workflowBriefing',
      imageSrc: '/images/showcase/01-workflow-briefing.webp',
      alt: t('platform.slides.workflowBriefing.alt'),
      caption: t('platform.slides.workflowBriefing.caption'),
    },
    {
      id: 'workflowPromoCandidates',
      imageSrc: '/images/showcase/02-workflow-promo-candidates.webp',
      alt: t('platform.slides.workflowPromoCandidates.alt'),
      caption: t('platform.slides.workflowPromoCandidates.caption'),
    },
    {
      id: 'workflowMenuTagger01',
      imageSrc: '/images/showcase/03-workflow-menu-tagger-01.webp',
      alt: t('platform.slides.workflowMenuTagger01.alt'),
      caption: t('platform.slides.workflowMenuTagger01.caption'),
    },
    {
      id: 'workflowMenuTagger02',
      imageSrc: '/images/showcase/04-workflow-menu-tagger-02.webp',
      alt: t('platform.slides.workflowMenuTagger02.alt'),
      caption: t('platform.slides.workflowMenuTagger02.caption'),
    },
    {
      id: 'heatmapDaily',
      imageSrc: '/images/showcase/heatmap-daily.webp',
      alt: t('platform.slides.heatmapDaily.alt'),
      caption: t('platform.slides.heatmapDaily.caption'),
    },
    {
      id: 'heatmapWeekly',
      imageSrc: '/images/showcase/heatmap-weekly.webp',
      alt: t('platform.slides.heatmapWeekly.alt'),
      caption: t('platform.slides.heatmapWeekly.caption'),
    },
    {
      id: 'menuComboAnalytics',
      imageSrc: '/images/showcase/menu-combo-analysis-01.webp',
      alt: t('platform.slides.menuComboAnalytics.alt'),
      caption: t('platform.slides.menuComboAnalytics.caption'),
    },
    {
      id: 'menuComboHeatmap',
      imageSrc: '/images/showcase/menu-combo-analysis-02.webp',
      alt: t('platform.slides.menuComboHeatmap.alt'),
      caption: t('platform.slides.menuComboHeatmap.caption'),
    },
  ] as const

  const platformBullets = [
    {
      title: t('platform.bullets.analysis.title'),
      description: t('platform.bullets.analysis.description'),
    },
    {
      title: t('platform.bullets.content.title'),
      description: t('platform.bullets.content.description'),
    },
    {
      title: t('platform.bullets.campaigns.title'),
      description: t('platform.bullets.campaigns.description'),
    },
  ] as const

  const faqItems = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q7'), answer: t('faq.a7') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
    { question: t('faq.q8'), answer: t('faq.a8') },
  ]

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background pb-[max(6rem,env(safe-area-inset-bottom,0px))] text-foreground md:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="min-w-0 w-full overflow-x-clip">
        <section className="relative w-full min-w-0 overflow-x-clip bg-gradient-to-b from-hero-gradient-from to-hero-gradient-to">
          <div
            className={cn(
              'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center',
              'pb-16 pt-8 text-center md:pb-24 md:pt-12',
              'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
            )}
          >
            <Badge
              variant="secondary"
              className="mb-4 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal px-3 py-1.5 text-center text-balance leading-snug"
            >
              <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
              {t('hero.badge')}
            </Badge>
            <LandingHeroHeadline variant={heroHeadlineVariant}>
              {t('hero.headline')}
            </LandingHeroHeadline>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-center text-lg leading-relaxed text-foreground/80 md:mt-6 md:text-xl md:leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Button size="lg" className="min-h-11 w-full sm:w-auto" asChild>
                <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>
        </section>

        <LandingBento
          sectionId="why"
          title={t('why.title')}
          subtitle={t('why.subtitle')}
          items={whyItems}
        />

        <LandingBento
          sectionId="foundation"
          title={t('foundation.title')}
          subtitle={t('foundation.subtitle')}
          items={foundationItems}
        />

        <LandingTrustStrip title={t('differentiators.title')} stats={differentiatorItems} />

        <LandingServicesGrid
          title={t('services.title')}
          subtitle={t('services.subtitle')}
          items={serviceItems}
        />

        <LandingFeatureSpotlight
          id="platform"
          title={t('platform.title')}
          subtitle={t('platform.subtitle')}
          bullets={platformBullets}
          stacked
          Icon={Bot}
          media={
            <HeroProductPreview
              slides={platformSlides}
              fullWidth
              viewLargerLabel={t('platform.viewLargerLabel')}
              carouselLabel={t('platform.carouselLabel')}
              carouselPrevLabel={t('platform.carouselPrevLabel')}
              carouselNextLabel={t('platform.carouselNextLabel')}
              carouselDotLabels={t.raw('platform.carouselDotLabels') as string[]}
              modalTitle={t('platform.modalTitle')}
            />
          }
        />

        <section
          id="vision"
          className="border-y border-border bg-muted/40 py-16 md:py-20"
          aria-labelledby="vision-heading"
        >
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2
              id="vision-heading"
              className="text-balance text-2xl font-bold leading-tight md:text-3xl"
            >
              {t('vision.title')}
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              {t('vision.description')}
            </p>
          </div>
        </section>

        <LandingFaq title={t('faq.title')} items={faqItems} />

        <section id="cta" className="bg-muted py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="mb-6 text-balance text-3xl font-bold leading-tight md:text-4xl md:leading-tight">
              {t('cta.title')}
            </h2>

            <p className="mb-10 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg md:leading-relaxed">
              {t('cta.description')}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="min-h-11 w-full px-8 sm:w-auto" asChild>
                <Link href={routes.login}>{t('cta.secondary')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter
        copyright={t('footer.copyrightName')}
        navLabel={t('footer.navLabel')}
        whyLabel={t('footer.why')}
        servicesLabel={t('footer.services')}
        platformLabel={t('footer.platform')}
        faqLabel={t('footer.faq')}
        privacyPolicyLabel={t('footer.privacyPolicy')}
        termsLabel={t('footer.terms')}
      />

      <div className="fixed bottom-0 left-0 z-50 flex w-full gap-3 border-t border-border bg-background/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <Button className="min-h-11 flex-1" size="lg" asChild>
          <Link href={routes.login}>{t('mobileCta.primary')}</Link>
        </Button>
        <Button className="min-h-11 flex-1" size="lg" variant="outline" asChild>
          <Link href="#services">{t('mobileCta.secondary')}</Link>
        </Button>
      </div>
    </div>
  )
}
