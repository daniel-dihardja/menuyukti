import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'
import { GitBranch, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { ReactElement } from 'react'

import { HeroProductPreview } from '@/app/_components/landing/hero-product-preview'
import {
  LandingHeroHeadline,
  parseLandingHeroHeadlineVariant,
} from '@/app/_components/landing/landing-hero-headline'
import { LandingFaq } from '@/app/_components/landing/landing-faq'
import { LandingFeatureSpotlight } from '@/app/_components/landing/landing-feature-spotlight'
import { LandingStudioTransformation } from '@/app/_components/landing/landing-studio-transformation'
import { LandingFooter } from '@/app/_components/landing/landing-footer'
import { LandingHowTwoSteps } from '@/app/_components/landing/landing-how-two-steps'
import { LandingProductPillars } from '@/app/_components/landing/landing-product-pillars'
import { routes } from '@/lib/routes'

const AUTOMATION_HIGHLIGHT_TERMS = [
  'deterministic analytics',
  'sales signals',
  'local pulse',
  'workflows',
  'milestone',
  'milestones',
  'analytics',
  'deterministic',
  'agentic',
  'ai',
] as const

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightAutomationTerms(text: string): Array<string | ReactElement> {
  const sortedTerms = [...AUTOMATION_HIGHLIGHT_TERMS].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`\\b(${sortedTerms.map(escapeRegex).join('|')})\\b`, 'gi')
  const segments = text.split(pattern)

  return segments.map((segment, index) => {
    const isMatch = sortedTerms.some((term) => term.toLowerCase() === segment.toLowerCase())

    if (!isMatch) return segment

    return (
      <strong key={`${segment}-${index}`} className="font-semibold text-foreground">
        {segment}
      </strong>
    )
  })
}

type LandingPageProps = {
  searchParams: Promise<{ heroHeadline?: string | string[] }>
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const t = await getTranslations('landing')
  const heroHeadlineVariant = parseLandingHeroHeadlineVariant((await searchParams).heroHeadline)

  const pillarItems = [
    {
      id: 'workflows' as const,
      title: t('pillars.items.workflows.title'),
      description: t('pillars.items.workflows.description'),
    },
    {
      id: 'studio' as const,
      title: t('pillars.items.studio.title'),
      description: t('pillars.items.studio.description'),
    },
  ] as const

  const workflowsBullets = [
    {
      title: t('workflows.bullets.templates.title'),
      description: t('workflows.bullets.templates.description'),
    },
    {
      title: t('workflows.bullets.salesData.title'),
      description: t('workflows.bullets.salesData.description'),
    },
    {
      title: t('workflows.bullets.presets.title'),
      description: t('workflows.bullets.presets.description'),
    },
    {
      title: t('workflows.bullets.transparent.title'),
      description: t('workflows.bullets.transparent.description'),
    },
  ] as const

  const studioBullets = [
    {
      title: t('studio.bullets.library.title'),
      description: t('studio.bullets.library.description'),
    },
    {
      title: t('studio.featuredFlows.heroShot.title'),
      description: t('studio.featuredFlows.heroShot.description'),
    },
    {
      title: t('studio.featuredFlows.goldenHour.title'),
      description: t('studio.featuredFlows.goldenHour.description'),
    },
    {
      title: t('studio.featuredFlows.prepareForAds.title'),
      description: t('studio.featuredFlows.prepareForAds.description'),
    },
    {
      title: t('studio.bullets.designs.title'),
      description: t('studio.bullets.designs.description'),
    },
    {
      title: t('studio.bullets.feedsWorkflows.title'),
      description: t('studio.bullets.feedsWorkflows.description'),
    },
  ] as const

  const howSteps = [
    {
      title: t('how.steps.workflows.title'),
      description: t('how.steps.workflows.description'),
      Icon: GitBranch,
    },
    {
      title: t('how.steps.studio.title'),
      description: t('how.steps.studio.description'),
      Icon: Sparkles,
    },
  ] as const

  const faqItems = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
  ]

  const automationItems = [
    {
      title: t('automation.items.campaignBrief.title'),
      description: t('automation.items.campaignBrief.description'),
    },
    {
      title: t('automation.items.promotionRanking.title'),
      description: t('automation.items.promotionRanking.description'),
    },
    {
      title: t('automation.items.storytellingStrength.title'),
      description: t('automation.items.storytellingStrength.description'),
    },
    {
      title: t('automation.items.timingCadence.title'),
      description: t('automation.items.timingCadence.description'),
    },
    {
      title: t('automation.items.copyAndVisualPrep.title'),
      description: t('automation.items.copyAndVisualPrep.description'),
    },
    {
      title: t('automation.items.humanControl.title'),
      description: t('automation.items.humanControl.description'),
    },
  ] as const

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
              className={cn(
                'mb-4 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal px-3 py-1.5 text-center text-balance leading-snug',
              )}
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

            <HeroProductPreview
              slides={[
                {
                  id: 'workflows01',
                  imageSrc: '/images/landing/workflow-campaign-brief-01.webp',
                  alt: t('hero.previewSlides.workflows01.alt'),
                  caption: t('hero.previewSlides.workflows01.caption'),
                },
                {
                  id: 'workflows02',
                  imageSrc: '/images/landing/workflow-campaign-brief-02.webp',
                  alt: t('hero.previewSlides.workflows02.alt'),
                  caption: t('hero.previewSlides.workflows02.caption'),
                },
                {
                  id: 'promoCandidates01',
                  imageSrc: '/images/landing/promo-candidates-01.webp',
                  alt: t('hero.previewSlides.promoCandidates01.alt'),
                  caption: t('hero.previewSlides.promoCandidates01.caption'),
                },
                {
                  id: 'promoCandidates02',
                  imageSrc: '/images/landing/promo-candidates-02.webp',
                  alt: t('hero.previewSlides.promoCandidates02.alt'),
                  caption: t('hero.previewSlides.promoCandidates02.caption'),
                },
                {
                  id: 'menuTagger01',
                  imageSrc: '/images/landing/menu-tagger-01.webp',
                  alt: t('hero.previewSlides.menuTagger01.alt'),
                  caption: t('hero.previewSlides.menuTagger01.caption'),
                },
                {
                  id: 'menuTagger02',
                  imageSrc: '/images/landing/menu-tagger-02.webp',
                  alt: t('hero.previewSlides.menuTagger02.alt'),
                  caption: t('hero.previewSlides.menuTagger02.caption'),
                },
              ]}
              viewLargerLabel={t('hero.viewLarger')}
              carouselLabel={t('hero.carouselLabel')}
              carouselPrevLabel={t('hero.carouselPrev')}
              carouselNextLabel={t('hero.carouselNext')}
              carouselDotLabels={[
                t('hero.carouselDot', { n: '1', total: '6' }),
                t('hero.carouselDot', { n: '2', total: '6' }),
                t('hero.carouselDot', { n: '3', total: '6' }),
                t('hero.carouselDot', { n: '4', total: '6' }),
                t('hero.carouselDot', { n: '5', total: '6' }),
                t('hero.carouselDot', { n: '6', total: '6' }),
              ]}
              modalTitle={t('hero.modalTitle')}
            />

            <div className="mt-8 hidden justify-center md:flex">
              <Button size="lg" variant="default" asChild>
                <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
                {t('automation.title')}
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
                {highlightAutomationTerms(t('automation.subtitle'))}
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
              {automationItems.map((item) => (
                <article key={item.title} className="rounded-xl border bg-card p-5">
                  <h3 className="text-base font-semibold leading-snug">
                    {highlightAutomationTerms(item.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                    {highlightAutomationTerms(item.description)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background py-14 md:py-16">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="text-pretty text-lg leading-relaxed text-foreground/85 md:text-xl">
              {t('problem')}
            </p>
            <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-relaxed text-foreground/75 md:text-lg">
              {t('solution')}
            </p>
          </div>
        </section>

        <LandingProductPillars
          title={t('pillars.title')}
          subtitle={t('pillars.subtitle')}
          items={pillarItems}
        />

        <div className="mx-auto max-w-6xl px-6">
          <Separator />
        </div>

        <LandingFeatureSpotlight
          id="workflows"
          title={t('workflows.title')}
          subtitle={t('workflows.subtitle')}
          bullets={workflowsBullets}
          imageSrc="/images/landing/workflow-campaign-brief.webp"
          imageAlt={t('workflows.imageAlt')}
          imageCaption={t('workflows.imageCaption')}
          Icon={GitBranch}
        />

        <LandingFeatureSpotlight
          id="studio"
          title={t('studio.title')}
          subtitle={t('studio.subtitle')}
          bullets={studioBullets}
          media={
            <LandingStudioTransformation
              title={t('studio.transformation.title')}
              intro={t('studio.transformation.intro')}
              steps={[
                {
                  label: t('studio.transformation.steps.source.label'),
                  alt: t('studio.transformation.steps.source.alt'),
                  caption: t('studio.transformation.steps.source.caption'),
                  imageSrc: '/images/landing/studio-transformation-source.webp',
                },
                {
                  label: t('studio.transformation.steps.lightFix.label'),
                  alt: t('studio.transformation.steps.lightFix.alt'),
                  captionLead: t('studio.transformation.steps.lightFix.captionLead'),
                  preparePoints: [
                    {
                      title: t('studio.transformation.steps.lightFix.points.light.title'),
                      description: t(
                        'studio.transformation.steps.lightFix.points.light.description',
                      ),
                    },
                    {
                      title: t('studio.transformation.steps.lightFix.points.composition.title'),
                      description: t(
                        'studio.transformation.steps.lightFix.points.composition.description',
                      ),
                    },
                  ],
                  imageSrc: '/images/landing/studio-transformation-cropped-light-fix.webp',
                },
                {
                  label: t('studio.transformation.steps.heroShot.label'),
                  alt: t('studio.transformation.steps.heroShot.alt'),
                  caption: t('studio.transformation.steps.heroShot.caption'),
                  imageSrc: '/images/landing/studio-transformation-hero-shot.webp',
                },
              ]}
            />
          }
          Icon={Sparkles}
          stacked
        />

        <LandingHowTwoSteps title={t('how.title')} subtitle={t('how.subtitle')} steps={howSteps} />

        <LandingFaq title={t('faq.title')} items={faqItems} />

        <section id="cta" className="bg-muted py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="mb-6 text-balance text-3xl font-bold leading-tight md:text-4xl md:leading-tight">
              {t('cta.title')}
            </h2>

            <p className="mb-10 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg md:leading-relaxed">
              {t('cta.description')}
            </p>

            <div className="hidden justify-center md:flex">
              <Button size="lg" className="px-8 py-6" asChild>
                <Link href={routes.login}>{t('cta.secondary')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter
        copyright={t('footer.copyrightName')}
        navLabel={t('footer.navLabel')}
        aboutLabel={t('footer.about')}
        contactLabel={t('footer.contact')}
        faqLabel={t('footer.faq')}
        workflowsLabel={t('footer.workflows')}
        studioLabel={t('footer.studio')}
        privacyPolicyLabel={t('footer.privacyPolicy')}
        termsLabel={t('footer.terms')}
      />

      <div className="fixed bottom-0 left-0 z-50 flex w-full gap-3 border-t border-border bg-background/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <Button className="min-h-11 flex-1" size="lg" asChild>
          <Link href={routes.login}>{t('mobileCta.primary')}</Link>
        </Button>
        <Button className="min-h-11 flex-1" size="lg" variant="outline" asChild>
          <Link href="#how-it-works">{t('mobileCta.secondary')}</Link>
        </Button>
      </div>
    </div>
  )
}
