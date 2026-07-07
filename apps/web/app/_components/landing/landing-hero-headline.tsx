import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

export type LandingHeroHeadlineVariant = 'default'

export const LANDING_HERO_HEADLINE_VARIANTS: readonly LandingHeroHeadlineVariant[] = ['default']

const baseClass = 'landing-hero-headline w-full min-w-0 text-balance text-foreground'

type LandingHeroHeadlineProps = {
  children: ReactNode
}

export function LandingHeroHeadline({ children }: LandingHeroHeadlineProps) {
  return <h1 className={cn(baseClass)}>{children}</h1>
}

export function parseLandingHeroHeadlineVariant(
  value: string | string[] | undefined,
): LandingHeroHeadlineVariant {
  void value
  return 'default'
}
