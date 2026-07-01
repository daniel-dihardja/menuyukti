import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { HeroProductPreviewDynamic } from '@/app/_components/landing/hero-product-preview-dynamic'
import {
  LandingHeroHeadline,
  parseLandingHeroHeadlineVariant,
} from '@/app/_components/landing/landing-hero-headline'
import { routes } from '@/lib/routes'

type LandingPageProps = {
  searchParams: Promise<{ heroHeadline?: string | string[] }>
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const t = await getTranslations('landing')
  const heroHeadlineVariant = parseLandingHeroHeadlineVariant((await searchParams).heroHeadline)

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

  const horizontalPadding =
    'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]'

  return (
    <div className="relative flex min-h-full min-w-0 flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="flex min-h-full min-w-0 w-full flex-1 flex-col">
        <section
          className={cn(
            'relative flex min-h-full w-full min-w-0 flex-1 flex-col',
            'bg-gradient-to-b from-hero-gradient-from to-hero-gradient-to font-sans',
            horizontalPadding,
            'py-6 md:py-8',
          )}
        >
          <div className="mx-auto flex w-full min-w-0 max-w-6xl shrink-0 flex-col items-center text-center">
            <Badge
              variant="secondary"
              className="landing-hero-badge mb-3 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal px-3 py-1.5 text-center text-balance leading-snug"
            >
              <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
              {t('hero.badge')}
            </Badge>
            <LandingHeroHeadline variant={heroHeadlineVariant}>
              {t('hero.headline')}
            </LandingHeroHeadline>

            <p className="landing-hero-subtitle mx-auto mt-4 max-w-2xl text-pretty text-center text-lg leading-relaxed text-foreground/80 md:mt-5 md:text-xl md:leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center md:mt-7">
              <Button size="lg" className="min-h-11 w-full sm:w-auto" asChild>
                <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-6 flex w-full min-h-0 max-w-[min(100%,90rem)] flex-1 flex-col justify-center lg:mt-8 lg:px-8">
            <HeroProductPreviewDynamic
              slides={platformSlides}
              size="hero"
              fullWidth
              viewLargerLabel={t('platform.viewLargerLabel')}
              carouselLabel={t('platform.carouselLabel')}
              carouselPrevLabel={t('platform.carouselPrevLabel')}
              carouselNextLabel={t('platform.carouselNextLabel')}
              carouselDotLabels={t.raw('platform.carouselDotLabels') as string[]}
              modalTitle={t('platform.modalTitle')}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
