import Link from 'next/link'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

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

  return (
    <div className="relative flex min-h-full min-w-0 flex-col overflow-x-clip bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="min-h-full min-w-0 w-full overflow-x-clip">
        <section className="relative flex min-h-full w-full min-w-0 items-center overflow-x-clip bg-gradient-to-b from-hero-gradient-from to-hero-gradient-to font-sans">
          <div
            className={cn(
              'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center',
              'py-16 text-center md:py-24',
              'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
            )}
          >
            <Badge
              variant="secondary"
              className="landing-hero-badge mb-4 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal px-3 py-1.5 text-center text-balance leading-snug"
            >
              <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
              {t('hero.badge')}
            </Badge>
            <LandingHeroHeadline variant={heroHeadlineVariant}>
              {t('hero.headline')}
            </LandingHeroHeadline>

            <p className="landing-hero-subtitle mx-auto mt-5 max-w-2xl text-pretty text-center text-lg leading-relaxed text-foreground/80 md:mt-6 md:text-xl md:leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Button size="lg" className="min-h-11 w-full sm:w-auto" asChild>
                <Link href={routes.login}>{t('hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
