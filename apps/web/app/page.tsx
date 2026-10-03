import { getTranslations } from 'next-intl/server'

import { LandingHero } from '@/app/_components/landing/landing-hero'
import { SiteFooter } from '@/components/site-footer'
import { getLandingSampleMenu } from '@/lib/landing/sample-menu'

export default async function LandingPage() {
  const t = await getTranslations('landing')
  const tHeader = await getTranslations('mainHeader')
  const sampleMenu = getLandingSampleMenu()

  return (
    <div className="relative flex min-h-full min-w-0 flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="flex min-w-0 w-full flex-1 flex-col">
        <LandingHero
          brand={tHeader('brand')}
          headline={t('hero.headline')}
          subtitle={t('hero.subtitle')}
          mobileCta={t('hero.mobileCta')}
          sampleMenu={sampleMenu}
          qr={{
            ariaLabel: t('hero.qr.ariaLabel'),
            caption: t('hero.qr.caption'),
            sampleHint: t('hero.qr.sampleHint'),
            linkLabel: t('hero.qr.linkLabel'),
          }}
        />
      </main>

      <SiteFooter />
    </div>
  )
}
