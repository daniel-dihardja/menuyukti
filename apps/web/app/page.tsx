import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { LandingHeroHeadline } from '@/app/_components/landing/landing-hero-headline'
import { LandingMenuMock } from '@/app/_components/landing/landing-menu-mock'
import { routes } from '@/lib/routes'

export default async function LandingPage() {
  const t = await getTranslations('landing')

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
            'relative flex min-h-full w-full min-w-0 flex-1 flex-col justify-center',
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
              <Badge
                variant="secondary"
                className="landing-hero-badge mb-3 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal px-3 py-1.5 text-center text-balance leading-snug lg:justify-start"
              >
                <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                {t('hero.badge')}
              </Badge>
              <LandingHeroHeadline>{t('hero.headline')}</LandingHeroHeadline>

              <p className="landing-hero-subtitle mt-4 max-w-xl text-pretty text-lg md:mt-5 md:text-xl">
                {t('hero.subtitle')}
              </p>

              <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center md:mt-7 lg:justify-start">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
                </Button>
              </div>
            </div>

            <div className="landing-menu-mock-enter flex w-full shrink-0 justify-center lg:w-auto lg:justify-end">
              <LandingMenuMock
                ariaLabel={t('hero.mock.ariaLabel')}
                eyebrow={t('hero.mock.eyebrow')}
                venueName={t('hero.mock.venueName')}
                tagline={t('hero.mock.tagline')}
                guestFavorite={t('hero.mock.guestFavorite')}
                category={t('hero.mock.category')}
                dish1Name={t('hero.mock.dish1Name')}
                dish1Price={t('hero.mock.dish1Price')}
                dish1Desc={t('hero.mock.dish1Desc')}
                dish2Name={t('hero.mock.dish2Name')}
                dish2Price={t('hero.mock.dish2Price')}
                dish2Desc={t('hero.mock.dish2Desc')}
                dish3Name={t('hero.mock.dish3Name')}
                dish3Price={t('hero.mock.dish3Price')}
                dish3Desc={t('hero.mock.dish3Desc')}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
