import { getTranslations } from 'next-intl/server'

import { LandingCapabilityHighlights } from '@/app/_components/landing/landing-capability-highlights'
import { LandingHero } from '@/app/_components/landing/landing-hero'
import { LandingMidIntro } from '@/app/_components/landing/landing-mid-intro'
import { SiteFooter } from '@/components/site-footer'
import { MARKETING_CONTACT_MAILTO } from '@/lib/marketing-contact'

export default async function LandingPage() {
  const t = await getTranslations('landing')

  return (
    <div className="relative flex min-h-full min-w-0 flex-1 flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="flex min-w-0 w-full flex-1 flex-col">
        <LandingHero
          headline={t('hero.headline')}
          subtitle={t('hero.subtitle')}
          primaryCta={t('hero.primaryCta')}
          primaryCtaHref={MARKETING_CONTACT_MAILTO}
          videoAriaLabel={t('hero.videoAriaLabel')}
        />

        <LandingCapabilityHighlights
          ariaLabel={t('capabilities.ariaLabel')}
          items={[
            {
              title: t('capabilities.workspace.title'),
              description: t('capabilities.workspace.description'),
            },
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
          ]}
        />

        <LandingMidIntro title={t('midIntro.title')} subtitle={t('midIntro.subtitle')} />
      </main>

      <SiteFooter />
    </div>
  )
}
