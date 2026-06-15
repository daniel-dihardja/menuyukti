import { BarChart3, Code2, Megaphone, PenLine, Share2, type LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

export type LandingServiceItem = {
  id: string
  title: string
  description: string
  bullets: readonly string[]
}

type LandingServicesGridProps = {
  title: string
  subtitle: string
  items: readonly LandingServiceItem[]
  consultationHref: string
  consultationLinkLabel: string
}

const serviceIcons = {
  analysis: BarChart3,
  content: PenLine,
  social: Share2,
  strategy: Megaphone,
  technical: Code2,
} as const satisfies Record<string, LucideIcon>

function getServiceIcon(id: string): LucideIcon {
  return serviceIcons[id as keyof typeof serviceIcons] ?? BarChart3
}

export function LandingServicesGrid({
  title,
  subtitle,
  items,
  consultationHref,
  consultationLinkLabel,
}: LandingServicesGridProps) {
  return (
    <section
      id="services"
      className="bg-background py-16 md:py-24"
      aria-labelledby="services-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="services-heading"
          className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
          {subtitle}
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = getServiceIcon(item.id)
            const isLastOdd = items.length % 3 !== 0 && index === items.length - 1

            return (
              <Card
                key={item.id}
                className={`shadow-none ${isLastOdd ? 'sm:col-span-2 lg:col-span-1' : ''}`}
              >
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
                  <CardDescription className="text-pretty text-base leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm leading-relaxed text-foreground/75">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="mt-10 text-center">
          <a
            href={consultationHref}
            className="text-base font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {consultationLinkLabel} →
          </a>
        </p>
      </div>
    </section>
  )
}
