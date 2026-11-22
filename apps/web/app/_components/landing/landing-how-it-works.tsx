import type { LucideIcon } from 'lucide-react'
import { CalendarDays, FileSpreadsheet, FolderOpen, MessageSquare } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

export type LandingHowItWorksStep = {
  title: string
  description: string
}

type LandingHowItWorksProps = {
  title: string
  subtitle: string
  steps: readonly LandingHowItWorksStep[]
}

const ICONS: readonly LucideIcon[] = [FolderOpen, FileSpreadsheet, CalendarDays, MessageSquare]

const ICON_WELL_CLASS = [
  'bg-[color:var(--color-accent-soft)] text-primary',
  'bg-[color-mix(in_srgb,var(--color-sky)_35%,white)] text-[color:var(--color-sky)]',
  'bg-[color-mix(in_srgb,var(--color-orange)_35%,white)] text-[color:var(--color-orange)]',
  'bg-[color-mix(in_srgb,var(--color-lavender)_35%,white)] text-[color:var(--color-lavender)]',
] as const

export function LandingHowItWorks({ title, subtitle, steps }: LandingHowItWorksProps) {
  return (
    <section
      id="how-it-works"
      className={cn(
        'border-t border-border bg-surface py-20 md:py-28',
        'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
      )}
      aria-labelledby="landing-how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="landing-how-it-works-heading"
            className="font-display text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl md:leading-tight"
          >
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {subtitle}
          </p>
        </div>

        <ol className="mt-14 grid list-none gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = ICONS[index % ICONS.length]!
            const wellClass = ICON_WELL_CLASS[index % ICON_WELL_CLASS.length]!
            const number = String(index + 1).padStart(2, '0')
            return (
              <li key={step.title} className="flex flex-col items-start gap-3 text-left">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-12 items-center justify-center rounded-full',
                      wellClass,
                    )}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-sm font-extrabold tracking-tight text-muted-foreground">
                    {number}
                  </span>
                </div>
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
