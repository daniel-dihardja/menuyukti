import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'

import { LandingHeroHeadline } from '@/app/_components/landing/landing-hero-headline'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

type LandingHeroProps = {
  eyebrow: string
  headline: string
  subtitle: string
  primaryCta: string
  /** Same gate as header Sign in (`NEXT_PUBLIC_SHOW_MARKETING_SIGN_IN`). */
  showPrimaryCta?: boolean
  productImageAlt: string
  trustItems: readonly string[]
}

export function LandingHero({
  eyebrow,
  headline,
  subtitle,
  primaryCta,
  showPrimaryCta = true,
  productImageAlt,
  trustItems,
}: LandingHeroProps) {
  const horizontalPadding =
    'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]'

  return (
    <section
      className={cn(
        'relative flex w-full min-w-0 flex-col justify-center',
        'bg-background font-sans',
        horizontalPadding,
        'py-14 md:py-20',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
      <div className="pointer-events-none absolute inset-0 landing-atmosphere" aria-hidden />

      <div
        className={cn(
          'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center gap-12',
          'lg:flex-row lg:items-center lg:justify-between lg:gap-14',
        )}
      >
        <div className="flex w-full min-w-0 max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <p className="landing-hero-badge text-primary">{eyebrow}</p>

          <LandingHeroHeadline>{headline}</LandingHeroHeadline>

          <p className="landing-hero-subtitle mt-4 max-w-xl text-pretty text-lg md:mt-5 md:text-xl">
            {subtitle}
          </p>

          {showPrimaryCta ? (
            <div className="mt-8 flex w-full max-w-md justify-center lg:justify-start">
              <Button asChild size="lg" className="hero-btn-primary w-full sm:w-auto">
                <Link href={routes.login}>{primaryCta}</Link>
              </Button>
            </div>
          ) : null}

          {trustItems.length > 0 ? (
            <ul className="mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              {trustItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] text-primary"
                    aria-hidden
                  >
                    <Check className="size-3 stroke-[2.5]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="landing-menu-mock-enter w-full min-w-0 max-w-xl shrink-0 lg:max-w-[min(100%,34rem)]">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-warm-lg)]">
            <Image
              src="/images/landing/bi-dashboard-placeholder.svg"
              alt={productImageAlt}
              width={1200}
              height={900}
              className="h-auto w-full"
              sizes="(max-width: 1023px) 100vw, 544px"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  )
}
