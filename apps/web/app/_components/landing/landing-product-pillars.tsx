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
  studioFootnote?: string
}

const pillarIcons = {
  studio: Sparkles,
  workflows: GitBranch,
} as const satisfies Record<LandingProductPillarId, typeof Sparkles>

export function LandingProductPillars({
  title,
  subtitle,
  items,
  studioFootnote,
}: LandingProductPillarsProps) {
  const featured = items.find((item) => item.id === 'workflows') ?? items[0]!
  const secondary = items.find((item) => item.id === 'studio')
  const FeaturedIcon = pillarIcons[featured.id]

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

        <div className="mt-12 flex flex-col gap-6">
          <Card className="border-primary/20 shadow-none">
            <CardHeader className="gap-3 md:p-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <FeaturedIcon className="size-5 text-primary" aria-hidden />
              </div>
              <CardTitle className="text-xl leading-snug md:text-2xl">{featured.title}</CardTitle>
              <CardDescription className="text-pretty text-base leading-relaxed md:text-lg">
                {featured.description}
              </CardDescription>
            </CardHeader>
          </Card>

          {secondary ? (
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                <span className="font-medium text-foreground/80">{secondary.title}:</span>{' '}
                {secondary.description}
              </p>
              {studioFootnote ? (
                <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground/80">
                  {studioFootnote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
