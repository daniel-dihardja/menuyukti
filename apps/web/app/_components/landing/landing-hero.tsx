import { LandingHeroHeadline } from '@/app/_components/landing/landing-hero-headline'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

type LandingHeroProps = {
  headline: string
  subtitle: string
  primaryCta: string
  primaryCtaHref: string
}

export function LandingHero({ headline, subtitle, primaryCta, primaryCtaHref }: LandingHeroProps) {
  const horizontalPadding =
    'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]'

  return (
    <section
      className={cn(
        'relative flex w-full min-w-0 flex-col justify-end overflow-hidden',
        'min-h-[min(100svh,52rem)] bg-background font-sans',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
      <div className="pointer-events-none absolute inset-0 landing-atmosphere" aria-hidden />

      <div
        className={cn(
          'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col',
          horizontalPadding,
          'pb-16 pt-28 md:pb-24 md:pt-36',
        )}
      >
        <div className="landing-menu-mock-enter flex w-full max-w-2xl flex-col items-start text-left">
          <LandingHeroHeadline>{headline}</LandingHeroHeadline>

          <p className="landing-hero-subtitle mt-5 max-w-xl text-pretty text-xl font-medium text-foreground md:mt-6 md:text-2xl">
            {subtitle}
          </p>

          <div className="mt-8 flex w-full max-w-md">
            <Button asChild size="lg" className="hero-btn-primary w-full sm:w-auto">
              <a href={primaryCtaHref}>{primaryCta}</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
