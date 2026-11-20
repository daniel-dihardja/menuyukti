import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LandingCapabilityHighlights } from '@/app/_components/landing/landing-capability-highlights'
import { LandingHero } from '@/app/_components/landing/landing-hero'
import { LandingMidIntro } from '@/app/_components/landing/landing-mid-intro'
import { LandingWhy } from '@/app/_components/landing/landing-why'
import { JsonLd } from '@/components/seo/json-ld'
import { SiteFooter } from '@/components/site-footer'
import { LANDING_SITE_URL } from '@/lib/landing/sample-menu'
import { MARKETING_CONTACT_EMAIL, MARKETING_CONTACT_MAILTO } from '@/lib/marketing-contact'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  const title = t('title')
  const description = t('description')
  const ogLocale = t('ogLocale')

  return {
    title,
    description,
    alternates: {
      canonical: LANDING_SITE_URL,
      languages: {
        de: LANDING_SITE_URL,
        'x-default': LANDING_SITE_URL,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: LANDING_SITE_URL,
      siteName: 'Menuyukti',
      type: 'website',
      locale: ogLocale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function LandingPage() {
  const t = await getTranslations('landing')
  const tMeta = await getTranslations('metadata')

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Menuyukti',
    legalName: 'Daniel Dihardja',
    description: tMeta('description'),
    url: LANDING_SITE_URL,
    logo: `${LANDING_SITE_URL}/icons/icon-512.png`,
    email: MARKETING_CONTACT_EMAIL,
    areaServed: 'DE',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Kurt-Eisner-Straße 68',
      addressLocality: 'Leipzig',
      postalCode: '04275',
      addressCountry: 'DE',
    },
  }

  return (
    <div className="relative flex min-h-full min-w-0 flex-1 flex-col bg-background text-foreground">
      <JsonLd data={organizationLd} />

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

        <LandingWhy
          title={t('why.title')}
          subtitle={t('why.subtitle')}
          items={[
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
          ]}
        />
      </main>

      <SiteFooter />
    </div>
  )
}
