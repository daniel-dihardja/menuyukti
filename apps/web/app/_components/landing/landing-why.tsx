import type { LucideIcon } from 'lucide-react'
import { Layers, Focus, BookOpen } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

type WhyItem = {
  title: string
  description: string
}

type LandingWhyProps = {
  title: string
  subtitle: string
  items: readonly WhyItem[]
}

const ICONS: readonly LucideIcon[] = [Focus, BookOpen, Layers]

const ICON_WELL_CLASS = [
  'bg-[color:var(--color-accent-soft)] text-primary',
  'bg-[color-mix(in_srgb,var(--color-sky)_35%,white)] text-[color:var(--color-sky)]',
  'bg-[color-mix(in_srgb,var(--color-lavender)_35%,white)] text-[color:var(--color-lavender)]',
] as const

export function LandingWhy({ title, subtitle, items }: LandingWhyProps) {
  return (
    <section
      id="why"
      className={cn(
        'border-t border-border bg-background py-20 md:py-28',
        'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
      )}
      aria-labelledby="landing-why-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="landing-why-heading"
            className="font-display text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl md:leading-tight"
          >
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length]!
            const wellClass = ICON_WELL_CLASS[index % ICON_WELL_CLASS.length]!
            return (
              <div key={item.title} className="flex flex-col items-start gap-3 text-left">
                <span
                  className={cn('flex size-12 items-center justify-center rounded-full', wellClass)}
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {item.title}
                </h3>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
