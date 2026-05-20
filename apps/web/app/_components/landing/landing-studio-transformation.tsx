import Image from 'next/image'
import { ArrowDown } from 'lucide-react'
import { Fragment } from 'react'

export type StudioTransformationStep = {
  label: string
  alt: string
  caption: string
  imageSrc: string
}

type LandingStudioTransformationProps = {
  title: string
  intro: string
  steps: readonly StudioTransformationStep[]
}

export function LandingStudioTransformation({
  title,
  intro,
  steps,
}: LandingStudioTransformationProps) {
  return (
    <figure className="min-w-0 w-full">
      <figcaption className="mb-4 text-pretty text-base font-semibold leading-snug text-foreground md:text-lg">
        {title}
      </figcaption>
      <p className="mb-8 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
        {intro}
      </p>

      <div role="list" className="flex w-full flex-col gap-6">
        {steps.map((step, index) => (
          <Fragment key={step.imageSrc}>
            <div role="listitem" className="flex w-full min-w-0 flex-col gap-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                {step.label}
              </span>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-lg ring-1 ring-border/40">
                <div className="relative aspect-[4/5] w-full max-h-[min(70vh,720px)] min-h-[280px] sm:min-h-[360px]">
                  <Image
                    src={step.imageSrc}
                    alt={step.alt}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 1152px) min(100vw - 3rem, 1088px), 1088px"
                    loading="lazy"
                  />
                </div>
              </div>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                {step.caption}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div className="flex justify-center py-1" aria-hidden>
                <ArrowDown className="size-6 text-muted-foreground" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </figure>
  )
}
