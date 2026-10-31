import { getTranslations } from 'next-intl/server'

import { LandingCapabilityHighlights } from '@/app/_components/landing/landing-capability-highlights'
import { LandingHero } from '@/app/_components/landing/landing-hero'
import { LandingMidIntro } from '@/app/_components/landing/landing-mid-intro'
import { SiteFooter } from '@/components/site-footer'
import { isMarketingSignInEnabled } from '@/lib/marketing-sign-in'

export default async function LandingPage() {
  const t = await getTranslations('landing')
  const showMarketingSignIn = isMarketingSignInEnabled()

  return (
    <div className="relative flex min-h-full min-w-0 flex-col bg-background pb-20 text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="flex min-w-0 w-full flex-1 flex-col">
        <LandingHero
          eyebrow={t('hero.eyebrow')}
          headline={t('hero.headline')}
          subtitle={t('hero.subtitle')}
          primaryCta={t('hero.primaryCta')}
          showPrimaryCta={showMarketingSignIn}
          productImageAlt={t('hero.productImageAlt')}
          trustItems={[
            t('hero.trust.salesImport'),
            t('hero.trust.advisorInsights'),
            t('hero.trust.forOperators'),
          ]}
        />

        <LandingCapabilityHighlights
          ariaLabel={t('capabilities.ariaLabel')}
          items={[
            {
              title: t('capabilities.reports.title'),
              description: t('capabilities.reports.description'),
            },
            {
              title: t('capabilities.advisor.title'),
              description: t('capabilities.advisor.description'),
            },
            {
              title: t('capabilities.locations.title'),
              description: t('capabilities.locations.description'),
            },
            {
              title: t('capabilities.workspace.title'),
              description: t('capabilities.workspace.description'),
            },
          ]}
        />

        <LandingMidIntro title={t('midIntro.title')} subtitle={t('midIntro.subtitle')} />
      </main>

      <SiteFooter />
    </div>
  )
}
