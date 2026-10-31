import type { LucideIcon } from 'lucide-react'
import { BarChart3, MapPin, Sparkles, Users } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

type CapabilityItem = {
  title: string
  description: string
}

type LandingCapabilityHighlightsProps = {
  ariaLabel: string
  items: readonly CapabilityItem[]
}

const ICONS: readonly LucideIcon[] = [BarChart3, Sparkles, MapPin, Users]

const ICON_WELL_CLASS = [
  'bg-[color:var(--color-accent-soft)] text-primary',
  'bg-[color-mix(in_srgb,var(--color-lavender)_35%,white)] text-[color:var(--color-lavender)]',
  'bg-[color-mix(in_srgb,var(--color-sky)_35%,white)] text-[color:var(--color-sky)]',
  'bg-[color-mix(in_srgb,var(--color-orange)_35%,white)] text-[color:var(--color-orange)]',
] as const

export function LandingCapabilityHighlights({
  ariaLabel,
  items,
}: LandingCapabilityHighlightsProps) {
  return (
    <section
      id="features"
      className="border-t border-border bg-background py-16 md:py-20"
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-6xl gap-10',
          'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
          'sm:grid-cols-2 lg:grid-cols-4 lg:gap-8',
        )}
      >
        {items.map((item, index) => {
          const Icon = ICONS[index % ICONS.length]!
          const wellClass = ICON_WELL_CLASS[index % ICON_WELL_CLASS.length]!
          return (
            <div key={item.title} className="flex flex-col items-start gap-3">
              <span
                className={cn('flex size-12 items-center justify-center rounded-full', wellClass)}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <h3 className="text-base font-semibold leading-snug text-foreground">{item.title}</h3>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
