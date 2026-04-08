import { BarChart3, Bot, LineChart } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

type BentoItem = {
  title: string
  description: string
}

type LandingBentoProps = {
  title: string
  subtitle: string
  items: readonly [BentoItem, BentoItem, BentoItem]
}

const icons = [BarChart3, Bot, LineChart] as const

export function LandingBento({ title, subtitle, items }: LandingBentoProps) {
  return (
    <section id="platform" className="bg-background py-24" aria-labelledby="bento-heading">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="bento-heading" className="text-balance text-center text-3xl font-bold md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-pretty text-foreground/80">
          {subtitle}
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[i]!
            return (
              <Card key={item.title} className="shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-pretty">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
