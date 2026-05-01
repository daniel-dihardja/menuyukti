import Image from 'next/image'

type HeroProductPreviewProps = {
  alt: string
  caption: string
}

const HERO_IMAGE = '/images/landing-workflow.webp'

/** Above-the-fold product screenshot (LCP). */
export function HeroProductPreview({ alt, caption }: HeroProductPreviewProps) {
  return (
    <figure className="mx-auto mt-10 w-full max-w-5xl md:mt-12">
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none">
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-lg ring-1 ring-border/40">
          <div className="relative aspect-video w-full">
            <Image
              src={HERO_IMAGE}
              alt={alt}
              fill
              className="object-cover object-top"
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1152px) min(100vw - 3rem, 1024px), 1024px"
            />
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-pretty text-sm leading-relaxed text-foreground/70">
        {caption}
      </figcaption>
    </figure>
  )
}
