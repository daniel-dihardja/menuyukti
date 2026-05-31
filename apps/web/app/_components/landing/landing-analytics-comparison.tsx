import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'
import { BarChart3, Sparkles } from 'lucide-react'

export type AnalyticsComparisonPoint = {
  pos: string
  menuyukti: string
}

type LandingAnalyticsComparisonProps = {
  title: string
  subtitle: string
  posColumnTitle: string
  menuyuktiColumnTitle: string
  points: readonly AnalyticsComparisonPoint[]
  impactTitle: string
  impactDescription: string
}

export function LandingAnalyticsComparison({
  title,
  subtitle,
  posColumnTitle,
  menuyuktiColumnTitle,
  points,
  impactTitle,
  impactDescription,
}: LandingAnalyticsComparisonProps) {
  return (
    <section
      id="analytics-comparison"
      className="bg-muted/40 py-16 md:py-24 [content-visibility:auto]"
      aria-labelledby="analytics-comparison-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="analytics-comparison-heading"
            className="text-balance text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
          >
            {title}
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader className="gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <BarChart3 className="size-5 text-muted-foreground" aria-hidden />
              </div>
              <CardTitle className="text-lg leading-snug">{posColumnTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-4">
                {points.map((point, index) => (
                  <li
                    key={`pos-${index}`}
                    className="text-pretty text-sm leading-relaxed text-foreground/75 md:text-base"
                  >
                    {point.pos}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className={cn('border-primary/25 shadow-none')}>
            <CardHeader className="gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="size-5 text-primary" aria-hidden />
              </div>
              <CardTitle className="text-lg leading-snug">{menuyuktiColumnTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-4">
                {points.map((point, index) => (
                  <li
                    key={`menuyukti-${index}`}
                    className="text-pretty text-sm leading-relaxed text-foreground/85 md:text-base"
                  >
                    {point.menuyukti}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl border bg-card p-6 text-center md:mt-12 md:p-8">
          <h3 className="text-balance text-lg font-semibold leading-snug md:text-xl">
            {impactTitle}
          </h3>
          <p className="mt-3 text-pretty text-base leading-relaxed text-foreground/75">
            {impactDescription}
          </p>
        </div>
      </div>
    </section>
  )
}
