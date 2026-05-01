import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import { LandingBento } from '@/app/_components/landing/landing-bento'
import { LandingFeatureHighlights } from '@/app/_components/landing/landing-feature-highlights'
import { LandingFaq } from '@/app/_components/landing/landing-faq'
import { LandingFooter } from '@/app/_components/landing/landing-footer'
import { LandingTrustStrip } from '@/app/_components/landing/landing-trust-strip'
import { HeroProductPreview } from '@/app/_components/landing/hero-product-preview'
import {
  AnalyticsIllustration,
  WorkflowIllustration,
} from '@/app/_components/landing/section-illustrations'
import { routes } from '@/lib/routes'
import { getTranslations } from 'next-intl/server'
import {
  Upload,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Leaf,
  Sparkles,
  PieChart,
  UtensilsCrossed,
  CalendarRange,
  ScrollText,
  Megaphone,
  Clock3,
  Activity,
  ChartNoAxesCombined,
  CircleCheckBig,
} from 'lucide-react'

export default async function LandingPage() {
  const t = await getTranslations('landing')

  const trustStats = [
    { value: t('trust.stat1Value'), label: t('trust.stat1Label') },
    { value: t('trust.stat2Value'), label: t('trust.stat2Label') },
    { value: t('trust.stat3Value'), label: t('trust.stat3Label') },
  ] as const

  const bentoItems = [
    { title: t('bento.item1Title'), description: t('bento.item1Description') },
    { title: t('bento.item2Title'), description: t('bento.item2Description') },
    { title: t('bento.item3Title'), description: t('bento.item3Description') },
  ] as const

  const faqItems = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
  ]

  const pipelineItems = [
    {
      Icon: CalendarRange,
      title: t('pipeline.nodes.datesTitle'),
      description: t('pipeline.nodes.datesDescription'),
    },
    {
      Icon: ScrollText,
      title: t('pipeline.nodes.brandBriefTitle'),
      description: t('pipeline.nodes.brandBriefDescription'),
    },
    {
      Icon: Megaphone,
      title: t('pipeline.nodes.promotionTitle'),
      description: t('pipeline.nodes.promotionDescription'),
    },
    {
      Icon: Clock3,
      title: t('pipeline.nodes.schedulerTitle'),
      description: t('pipeline.nodes.schedulerDescription'),
    },
  ] as const

  const signalItems = [
    {
      Icon: Activity,
      title: t('signals.items.demandTitle'),
      description: t('signals.items.demandDescription'),
    },
    {
      Icon: ChartNoAxesCombined,
      title: t('signals.items.mixTitle'),
      description: t('signals.items.mixDescription'),
    },
    {
      Icon: CircleCheckBig,
      title: t('signals.items.evidenceTitle'),
      description: t('signals.items.evidenceDescription'),
    },
  ] as const

  const featureCards = [
    {
      title: t('featureHighlights.cards.workflowTitle'),
      description: t('featureHighlights.cards.workflowDescription'),
      image: '/images/landing-workflow.webp',
      alt: t('featureHighlights.cards.workflowAlt'),
    },
    {
      title: t('featureHighlights.cards.promotionTitle'),
      description: t('featureHighlights.cards.promotionDescription'),
      image: '/images/landing-promotion.webp',
      alt: t('featureHighlights.cards.promotionAlt'),
    },
  ] as const

  return (
    <div className="relative flex min-h-screen flex-col bg-background pb-[max(6rem,env(safe-area-inset-bottom,0px))] text-foreground md:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <header className="sticky top-0 z-50 w-full border-b border-border backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-2">
            <UtensilsCrossed className="size-5 shrink-0 text-primary" aria-hidden />
            <p className="truncate text-xl font-semibold tracking-tight md:text-2xl">
              {t('brand')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" asChild>
              <Link href={routes.login}>{t('header.signIn')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative w-full bg-gradient-to-b from-muted/30 to-background">
          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 text-center md:pb-24 md:pt-16">
            <Badge variant="secondary" className="mb-4">
              {t('hero.badge')}
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl md:leading-[1.08]">
              {t('hero.headline')}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-foreground/80 md:mt-6 md:text-xl md:leading-relaxed">
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

        <div className="mx-auto max-w-6xl px-6">
          <Separator />
        </div>

        <LandingTrustStrip title={t('trust.title')} stats={trustStats} />

        <div className="mx-auto max-w-6xl px-6">
          <Separator />
        </div>

        <section id="problem" className="bg-muted">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 md:grid-cols-2">
            <figure className="order-1 overflow-hidden rounded-xl border border-border shadow-lg md:order-2">
              <div className="aspect-[4/3] w-full [&>svg]:h-full [&>svg]:w-full">
                <AnalyticsIllustration decorative />
              </div>
              <figcaption className="sr-only">{t('problemImageAlt')}</figcaption>
            </figure>

            <div className="order-2 md:order-1">
              <p className="text-pretty text-xl leading-relaxed text-foreground/90 md:text-2xl">
                {t('problem')}
              </p>
            </div>
          </div>
        </section>

        <section id="solution" className="bg-background">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 md:grid-cols-2">
            <figure className="overflow-hidden rounded-xl border border-border shadow-lg">
              <div className="aspect-[4/3] w-full [&>svg]:h-full [&>svg]:w-full">
                <WorkflowIllustration decorative />
              </div>
              <figcaption className="sr-only">{t('solutionImageAlt')}</figcaption>
            </figure>

            <div>
              <p className="text-pretty text-xl leading-relaxed text-foreground/90 md:text-2xl">
                {t('solution')}
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-muted py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-16 text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight">
              {t('how.title')}
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {(
                [
                  {
                    Icon: Upload,
                    titleKey: 'how.steps.upload.title',
                    descKey: 'how.steps.upload.description',
                  },
                  {
                    Icon: BarChart3,
                    titleKey: 'how.steps.analyze.title',
                    descKey: 'how.steps.analyze.description',
                  },
                  {
                    Icon: Lightbulb,
                    titleKey: 'how.steps.act.title',
                    descKey: 'how.steps.act.description',
                  },
                ] as const
              ).map(({ Icon, titleKey, descKey }) => (
                <Card key={titleKey} className="text-center shadow-md">
                  <CardHeader>
                    <div className="mb-4 flex justify-center">
                      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="size-6 text-primary" aria-hidden />
                      </div>
                    </div>
                    <CardTitle className="text-xl leading-snug">{t(titleKey)}</CardTitle>
                    <CardDescription className="text-pretty text-base leading-relaxed">
                      {t(descKey)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pipeline" className="bg-background py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight">
              {t('pipeline.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              {t('pipeline.subtitle')}
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {pipelineItems.map(({ Icon, title, description }) => (
                <Card key={title} className="shadow-md">
                  <CardHeader>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="size-5 text-primary" aria-hidden />
                    </div>
                    <CardTitle className="text-lg leading-snug">{title}</CardTitle>
                    <CardDescription className="text-pretty text-base leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="signals" className="bg-muted py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight">
              {t('signals.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              {t('signals.subtitle')}
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {signalItems.map(({ Icon, title, description }) => (
                <Card key={title} className="shadow-md">
                  <CardHeader>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="size-5 text-primary" aria-hidden />
                    </div>
                    <CardTitle className="text-lg leading-snug">{title}</CardTitle>
                    <CardDescription className="text-pretty text-base leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <LandingFeatureHighlights
          title={t('featureHighlights.title')}
          subtitle={t('featureHighlights.subtitle')}
          cards={featureCards}
        />

        <LandingBento title={t('bento.title')} subtitle={t('bento.subtitle')} items={bentoItems} />

        <section className="bg-background py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-6 text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight">
              {t('why.title')}
            </h2>

            <p className="mx-auto mb-16 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              {t('why.subtitle')}
            </p>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  { Icon: PieChart, cardKey: 'insights' as const },
                  { Icon: Leaf, cardKey: 'waste' as const },
                  { Icon: Sparkles, cardKey: 'ops' as const },
                  { Icon: TrendingUp, cardKey: 'margin' as const },
                ] as const
              ).map(({ Icon, cardKey }) => (
                <Card key={cardKey} className="text-center shadow-md">
                  <CardHeader>
                    <div className="mb-4 flex justify-center">
                      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="size-6 text-primary" aria-hidden />
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-snug">
                      {t(`why.cards.${cardKey}`)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
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
