import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { LandingHeroHeadline } from '@/app/_components/landing/landing-hero-headline'
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
          <div className="relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center text-center">
            <Badge
              variant="secondary"
              className="landing-hero-badge mb-3 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal px-3 py-1.5 text-center text-balance leading-snug"
            >
              <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
              {t('hero.badge')}
            </Badge>
            <LandingHeroHeadline>{t('hero.headline')}</LandingHeroHeadline>

            <p className="landing-hero-subtitle mx-auto mt-4 max-w-2xl text-pretty text-center text-lg md:mt-5 md:text-xl">
              {t('hero.subtitle')}
            </p>

            <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center md:mt-7">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
