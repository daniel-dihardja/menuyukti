import Image, { type StaticImageData } from 'next/image'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type FeatureCard = {
  title: string
  description: string
  image: StaticImageData
  alt: string
}

type LandingFeatureHighlightsProps = {
  title: string
  subtitle: string
  cards: readonly FeatureCard[]
}

export function LandingFeatureHighlights({
  title,
  subtitle,
  cards,
}: LandingFeatureHighlightsProps) {
  return (
    <section
      id="feature-highlights"
      className="bg-muted py-24"
      aria-labelledby="feature-highlights-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="feature-highlights-heading"
          className="text-balance text-center text-3xl font-bold md:text-4xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-center text-pretty text-foreground/80">
          {subtitle}
        </p>

        <div className="mt-12 space-y-6">
          {cards.map((card) => (
            <Card key={card.title} className="overflow-hidden border-border/80 shadow-md">
              <div className="border-b border-border bg-background p-2">
                <div className="overflow-hidden rounded-md border border-border">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    className="h-auto w-full object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-pretty text-sm text-foreground/75">
                  {card.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
