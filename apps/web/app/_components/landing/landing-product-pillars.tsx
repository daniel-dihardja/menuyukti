import { Badge } from '@workspace/ui/components/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { GitBranch, MessageSquare, Sparkles, Store } from 'lucide-react'

export type LandingProductPillarId = 'printShop' | 'studio' | 'strategyChat' | 'workflowsPro'

export type LandingProductPillarItem = {
  id: LandingProductPillarId
  title: string
  description: string
  badge?: 'pro'
}

type LandingProductPillarsProps = {
  title: string
  subtitle: string
  items: readonly LandingProductPillarItem[]
  proBadgeLabel: string
}

const pillarIcons = {
  printShop: Store,
  studio: Sparkles,
  strategyChat: MessageSquare,
  workflowsPro: GitBranch,
} as const satisfies Record<LandingProductPillarId, typeof Store>

export function LandingProductPillars({
  title,
  subtitle,
  items,
  proBadgeLabel,
}: LandingProductPillarsProps) {
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

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = pillarIcons[item.id]
            return (
              <Card key={item.id} className="shadow-md">
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="size-5 text-primary" aria-hidden />
                    </div>
                    {item.badge === 'pro' ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-xs font-semibold uppercase tracking-wide"
                      >
                        {proBadgeLabel}
                      </Badge>
                    ) : null}
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
