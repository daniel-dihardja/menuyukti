import Link from 'next/link'

import { LandingHeroHeadline } from '@/app/_components/landing/landing-hero-headline'
import { LandingSampleMenuQr } from '@/app/_components/landing/landing-sample-menu-qr'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

type LandingHeroQrCopy = {
  ariaLabel: string
  caption: string
  sampleHint: string
  linkLabel: string
}

type LandingHeroSampleMenu = {
  absoluteUrl: string
  path: string
}

type LandingHeroProps = {
  brand: string
  headline: string
  subtitle: string
  mobileCta: string
  sampleMenu: LandingHeroSampleMenu | null
  qr: LandingHeroQrCopy
}

export function LandingHero({
  brand,
  headline,
  subtitle,
  mobileCta,
  sampleMenu,
  qr,
}: LandingHeroProps) {
  const horizontalPadding =
    'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]'

  return (
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
          <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl lg:text-4xl">
            {brand}
          </p>

          <LandingHeroHeadline>{headline}</LandingHeroHeadline>

          <p className="landing-hero-subtitle mt-4 max-w-xl text-pretty text-lg md:mt-5 md:text-xl">
            {subtitle}
          </p>

          {sampleMenu ? (
            <>
              <Button asChild size="lg" className="hero-btn-primary mt-8 w-full max-w-xs lg:hidden">
                <Link href={sampleMenu.path}>{mobileCta}</Link>
              </Button>

              <div className="landing-qr-enter mt-6 flex w-full flex-col items-center gap-2 lg:mt-8 lg:hidden">
                <LandingSampleMenuQr
                  value={sampleMenu.absoluteUrl}
                  href={sampleMenu.path}
                  ariaLabel={qr.ariaLabel}
                  linkLabel={qr.linkLabel}
                  size={160}
                />
                <p className="text-xs text-muted-foreground">{qr.sampleHint}</p>
              </div>
            </>
          ) : null}
        </div>

        {sampleMenu ? (
          <div className="landing-qr-enter hidden w-full shrink-0 flex-col items-center gap-2 lg:flex lg:w-auto lg:items-end">
            <LandingSampleMenuQr
              value={sampleMenu.absoluteUrl}
              href={sampleMenu.path}
              ariaLabel={qr.ariaLabel}
              linkLabel={qr.linkLabel}
              size={220}
            />
            <p className="text-sm text-muted-foreground">{qr.caption}</p>
            <p className="text-xs text-muted-foreground">{qr.sampleHint}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
