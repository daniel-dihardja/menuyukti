import Image from 'next/image'

type LandingStudioScreenshotProps = {
  alt: string
  caption: string
}

const STUDIO_SCREENSHOT = '/images/landing/studio-interface.webp'

export function LandingStudioScreenshot({ alt, caption }: LandingStudioScreenshotProps) {
  return (
    <figure className="min-w-0 w-full">
      <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-lg ring-1 ring-border/40">
        <div className="relative aspect-video w-full min-h-[200px]">
          <Image
            src={STUDIO_SCREENSHOT}
            alt={alt}
            fill
            className="object-cover object-top"
            sizes="(max-width: 1152px) min(100vw - 3rem, 1088px), 1088px"
            loading="lazy"
          />
        </div>
      </div>
      <figcaption className="mt-4 text-pretty text-sm leading-relaxed text-foreground/70 md:text-base">
        {caption}
      </figcaption>
    </figure>
  )
}
