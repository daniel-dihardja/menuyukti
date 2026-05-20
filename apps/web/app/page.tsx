import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'
import { GitBranch, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { HeroProductPreview } from '@/app/_components/landing/hero-product-preview'
import { LandingFaq } from '@/app/_components/landing/landing-faq'
import { LandingFeatureSpotlight } from '@/app/_components/landing/landing-feature-spotlight'
import { LandingStudioScreenshot } from '@/app/_components/landing/landing-studio-screenshot'
import { LandingStudioTransformation } from '@/app/_components/landing/landing-studio-transformation'
import { LandingFooter } from '@/app/_components/landing/landing-footer'
import { LandingHowTwoSteps } from '@/app/_components/landing/landing-how-two-steps'
import { LandingProductPillars } from '@/app/_components/landing/landing-product-pillars'
import { routes } from '@/lib/routes'

export default async function LandingPage() {
  const t = await getTranslations('landing')

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
      title: t('how.steps.studio.title'),
      description: t('how.steps.studio.description'),
      Icon: Sparkles,
    },
    {
      title: t('how.steps.workflows.title'),
      description: t('how.steps.workflows.description'),
      Icon: GitBranch,
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

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background pb-[max(6rem,env(safe-area-inset-bottom,0px))] text-foreground md:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="min-w-0 w-full overflow-x-clip">
        <section className="relative w-full min-w-0 overflow-x-clip bg-gradient-to-b from-muted/30 to-background">
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
                'mb-4 min-w-0 max-w-full whitespace-normal px-3 py-1.5 text-center text-balance leading-snug',
              )}
            >
              {t('hero.badge')}
            </Badge>
            <h1 className="w-full min-w-0 text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl md:leading-[1.08]">
              {t('hero.headline')}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-center text-lg leading-relaxed text-foreground/80 md:mt-6 md:text-xl md:leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <HeroProductPreview alt={t('hero.previewAlt')} caption={t('hero.previewCaption')} />

            <div className="mt-8 hidden justify-center md:flex">
              <Button size="lg" variant="default" asChild>
                <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
              </Button>
            </div>
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
            <div className="flex w-full min-w-0 flex-col gap-14">
              <LandingStudioScreenshot
                alt={t('studio.imageAlt')}
                caption={t('studio.imageCaption')}
              />
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
                    caption: t('studio.transformation.steps.lightFix.caption'),
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
            </div>
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
