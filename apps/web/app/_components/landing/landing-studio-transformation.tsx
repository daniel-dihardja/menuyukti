import Image from 'next/image'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { Fragment } from 'react'

export type StudioTransformationPreparePoint = {
  title: string
  description: string
}

export type StudioTransformationStep = {
  label: string
  alt: string
  imageSrc: string
  /** Single paragraph when the step has no structured prepare points. */
  caption?: string
  /** Step 2-style lead-in plus light + composition bullets. */
  captionLead?: string
  preparePoints?: readonly StudioTransformationPreparePoint[]
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

      <div role="list" className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-3">
        {steps.map((step, index) => (
          <Fragment key={step.imageSrc}>
            <div role="listitem" className="flex w-full min-w-0 flex-col gap-3 lg:flex-1">
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                {step.label}
              </span>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
                <div className="relative aspect-[4/5] w-full min-h-[280px] sm:min-h-[360px] md:aspect-[3/4] md:min-h-0">
                  <Image
                    src={step.imageSrc}
                    alt={step.alt}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 1023px) 100vw, 33vw"
                    loading="lazy"
                  />
                </div>
              </div>
              {step.preparePoints != null && step.preparePoints.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {step.captionLead != null ? (
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                      {step.captionLead}
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                    {step.preparePoints.map((point) => (
                      <li key={point.title} className="min-w-0 text-pretty">
                        <span className="font-medium text-foreground">{point.title}</span>
                        {' — '}
                        {point.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                  {step.caption}
                </p>
              )}
            </div>
            {index < steps.length - 1 ? (
              <div
                className="flex shrink-0 justify-center py-1 md:items-center md:self-center md:py-0"
                aria-hidden
              >
                <ArrowDown className="size-6 text-muted-foreground lg:hidden" />
                <ArrowRight className="hidden size-6 text-muted-foreground lg:block" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </figure>
  )
}
