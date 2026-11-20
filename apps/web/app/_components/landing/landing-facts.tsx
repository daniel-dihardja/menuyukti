import { cn } from '@workspace/ui/lib/utils'

type LandingFactsProps = {
  title: string
  items: readonly string[]
}

export function LandingFacts({ title, items }: LandingFactsProps) {
  return (
    <section
      id="facts"
      className={cn(
        'border-t border-border bg-muted/40 py-20 md:py-24',
        'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
      )}
      aria-labelledby="landing-facts-heading"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="landing-facts-heading"
          className="font-display text-balance text-center text-3xl font-extrabold tracking-tight text-foreground md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <ul className="mt-10 space-y-4">
          {items.map((item) => (
            <li
              key={item}
              className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
