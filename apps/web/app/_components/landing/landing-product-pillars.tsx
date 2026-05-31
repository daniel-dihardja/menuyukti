import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { GitBranch, Sparkles } from 'lucide-react'

export type LandingProductPillarId = 'studio' | 'workflows'

export type LandingProductPillarItem = {
  id: LandingProductPillarId
  title: string
  description: string
}

type LandingProductPillarsProps = {
  title: string
  subtitle: string
  items: readonly LandingProductPillarItem[]
}

const pillarIcons = {
  studio: Sparkles,
  workflows: GitBranch,
} as const satisfies Record<LandingProductPillarId, typeof Sparkles>

export function LandingProductPillars({ title, subtitle, items }: LandingProductPillarsProps) {
  return (
    <section
      id="product-pillars"
      className="bg-background py-16 md:py-20"
      aria-labelledby="product-pillars-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="product-pillars-heading"
          className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
          {subtitle}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = pillarIcons[item.id]
            return (
              <Card key={item.id} className="shadow-none">
                <CardHeader className="gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
                  <CardDescription className="text-pretty text-base leading-relaxed">
                    {item.description}
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
