import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import type { LucideIcon } from 'lucide-react'

export type LandingHowStep = {
  title: string
  description: string
  Icon: LucideIcon
}

type LandingHowTwoStepsProps = {
  title: string
  subtitle: string
  steps: readonly LandingHowStep[]
}

export function LandingHowTwoSteps({ title, subtitle, steps }: LandingHowTwoStepsProps) {
  return (
    <section
      id="how-it-works"
      className="bg-muted py-16 md:py-24 [content-visibility:auto]"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="how-it-works-heading"
          className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
          {subtitle}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.Icon
            return (
              <Card key={step.title} className="shadow-md">
                <CardHeader>
                  <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <CardTitle className="text-lg leading-snug">{step.title}</CardTitle>
                  <CardDescription className="text-pretty text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
