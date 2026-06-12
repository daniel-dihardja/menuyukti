import { cn } from '@workspace/ui/lib/utils'
import type { ReactNode } from 'react'

/** Preview on the landing page: `/?heroHeadline=warm|soft|gradient|default` */
export type LandingHeroHeadlineVariant = 'default' | 'warm' | 'soft' | 'gradient'

export const LANDING_HERO_HEADLINE_VARIANTS: readonly LandingHeroHeadlineVariant[] = [
  'default',
  'warm',
  'soft',
  'gradient',
]

const variantClass: Record<LandingHeroHeadlineVariant, string> = {
  default: 'text-foreground',
  warm: 'hero-headline-warm tracking-tight',
  soft: 'hero-headline-soft font-semibold tracking-tight',
  gradient: 'hero-headline-gradient tracking-tight',
}

const baseClass =
  'w-full min-w-0 text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl md:leading-[1.08]'

type LandingHeroHeadlineProps = {
  children: ReactNode
  variant?: LandingHeroHeadlineVariant
}

export function LandingHeroHeadline({ children, variant = 'warm' }: LandingHeroHeadlineProps) {
  return <h1 className={cn(baseClass, variantClass[variant])}>{children}</h1>
}

export function parseLandingHeroHeadlineVariant(
  value: string | string[] | undefined,
): LandingHeroHeadlineVariant {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw && LANDING_HERO_HEADLINE_VARIANTS.includes(raw as LandingHeroHeadlineVariant)) {
    return raw as LandingHeroHeadlineVariant
  }
  return 'warm'
}
