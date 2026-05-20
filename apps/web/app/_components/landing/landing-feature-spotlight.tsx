import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@workspace/ui/lib/utils'

export type LandingFeatureBullet = {
  title: string
  description: string
}

type LandingFeatureSpotlightProps = {
  id: string
  title: string
  subtitle: string
  bullets: readonly LandingFeatureBullet[]
  imageSrc?: string
  imageAlt?: string
  imageCaption?: string
  media?: ReactNode
  Icon: LucideIcon
  reverse?: boolean
  /** Text above, media below — use for wide image galleries (e.g. Studio transformation). */
  stacked?: boolean
}

export function LandingFeatureSpotlight({
  id,
  title,
  subtitle,
  bullets,
  imageSrc,
  imageAlt,
  imageCaption,
  media,
  Icon,
  reverse = false,
  stacked = false,
}: LandingFeatureSpotlightProps) {
  const imageBlock =
    media ??
    (imageSrc && imageAlt ? (
      <figure className="min-w-0">
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-lg ring-1 ring-border/40">
          <div className="relative aspect-video w-full">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              loading="lazy"
            />
          </div>
        </div>
        {imageCaption ? (
          <figcaption className="mt-4 text-pretty text-center text-sm leading-relaxed text-foreground/70 lg:text-left">
            {imageCaption}
          </figcaption>
        ) : null}
      </figure>
    ) : null)
  return (
    <section
      id={id}
      className="bg-background py-16 md:py-24 [content-visibility:auto]"
      aria-labelledby={`${id}-heading`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={cn(
            'grid grid-cols-1 gap-10',
            stacked ? 'gap-12' : 'items-center lg:grid-cols-2 lg:gap-16',
            !stacked && reverse && 'lg:[&>*:first-child]:order-2',
          )}
        >
          <div className="min-w-0">
            <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-primary/10">
              <Icon className="size-6 text-primary" aria-hidden />
            </div>
            <h2
              id={`${id}-heading`}
              className="text-balance text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
            >
              {title}
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              {subtitle}
            </p>
            <ul className="mt-8 flex flex-col gap-5">
              {bullets.map((bullet) => (
                <li key={bullet.title} className="min-w-0">
                  <h3 className="text-base font-semibold leading-snug md:text-lg">
                    {bullet.title}
                  </h3>
                  <p className="mt-1 text-pretty text-base leading-relaxed text-muted-foreground">
                    {bullet.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {imageBlock}
        </div>
      </div>
    </section>
  )
}
