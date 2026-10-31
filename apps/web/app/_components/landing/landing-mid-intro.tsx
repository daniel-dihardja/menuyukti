import { cn } from '@workspace/ui/lib/utils'

type LandingMidIntroProps = {
  title: string
  subtitle: string
}

export function LandingMidIntro({ title, subtitle }: LandingMidIntroProps) {
  return (
    <section
      className={cn(
        'border-t border-border bg-surface py-20 md:py-28',
        'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
      )}
      aria-labelledby="landing-mid-intro-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="landing-mid-intro-heading"
          className="font-display text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {subtitle}
        </p>
      </div>
    </section>
  )
}
