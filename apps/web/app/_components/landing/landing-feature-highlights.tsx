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
  image: StaticImageData | string
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
      className="bg-secondary py-24"
      aria-labelledby="feature-highlights-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="feature-highlights-heading"
          className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
          {subtitle}
        </p>

        <div className="mt-12 flex flex-col gap-6">
          {cards.map((card) => (
            <Card key={card.title} className="overflow-hidden shadow-none">
              <div className="border-b border-border bg-background p-2">
                <div className="overflow-hidden rounded-md border border-border">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    width={1920}
                    height={1080}
                    className="h-auto w-full object-cover"
                    sizes="(max-width: 768px) 100vw, 1080px"
                    loading="lazy"
                  />
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-xl leading-snug">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-pretty text-base leading-relaxed text-foreground/80">
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
