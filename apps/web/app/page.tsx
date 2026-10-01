import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { LandingHeroHeadline } from '@/app/_components/landing/landing-hero-headline'
import { LandingSampleMenuQr } from '@/app/_components/landing/landing-sample-menu-qr'
import { SiteFooter } from '@/components/site-footer'
import { getLandingSampleMenu } from '@/lib/landing/sample-menu'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

export default async function LandingPage() {
  const t = await getTranslations('landing')
  const sampleMenu = getLandingSampleMenu()

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

      <main id="main-content" className="flex min-w-0 w-full flex-1 flex-col">
        <section
          className={cn(
            'relative flex w-full min-w-0 flex-1 flex-col justify-center',
            'bg-background font-sans',
            horizontalPadding,
            'py-12 md:py-16',
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
          <div className="pointer-events-none absolute inset-0 landing-atmosphere" aria-hidden />
          <div
            className={cn(
              'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center gap-10',
              'lg:flex-row lg:items-center lg:justify-between lg:gap-14',
            )}
          >
            <div className="flex w-full min-w-0 max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
              <LandingHeroHeadline>{t('hero.headline')}</LandingHeroHeadline>

              <p className="landing-hero-subtitle mt-4 max-w-xl text-pretty text-lg md:mt-5 md:text-xl">
                {t('hero.subtitle')}
              </p>

              {sampleMenu ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="hero-btn-primary mt-8 w-full max-w-xs lg:hidden"
                  >
                    <Link href={sampleMenu.path}>{t('hero.mobileCta')}</Link>
                  </Button>

                  <div className="landing-qr-enter mt-6 flex w-full flex-col items-center gap-2 lg:mt-8 lg:hidden">
                    <LandingSampleMenuQr
                      value={sampleMenu.absoluteUrl}
                      href={sampleMenu.path}
                      ariaLabel={t('hero.qr.ariaLabel')}
                      linkLabel={t('hero.qr.linkLabel')}
                      size={160}
                    />
                    <p className="text-xs text-muted-foreground">{t('hero.qr.sampleHint')}</p>
                  </div>
                </>
              ) : null}
            </div>

            {sampleMenu ? (
              <div className="landing-qr-enter hidden w-full shrink-0 flex-col items-center gap-2 lg:flex lg:w-auto lg:items-end">
                <LandingSampleMenuQr
                  value={sampleMenu.absoluteUrl}
                  href={sampleMenu.path}
                  ariaLabel={t('hero.qr.ariaLabel')}
                  linkLabel={t('hero.qr.linkLabel')}
                  size={220}
                />
                <p className="text-sm text-muted-foreground">{t('hero.qr.caption')}</p>
                <p className="text-xs text-muted-foreground">{t('hero.qr.sampleHint')}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
