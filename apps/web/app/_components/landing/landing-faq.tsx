import { LandingFaqAccordion } from '@/app/_components/landing/landing-faq-accordion'

type FaqItem = {
  question: string
  answer: string
}

type LandingFaqProps = {
  title: string
  items: FaqItem[]
}

export function LandingFaq({ title, items }: LandingFaqProps) {
  return (
    <section
      id="faq"
      className="border-t border-border bg-background py-20 md:py-28 pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] [content-visibility:auto]"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="faq-heading"
          className="font-display text-balance text-center text-3xl font-extrabold tracking-tight text-foreground md:text-4xl md:leading-tight"
        >
          {title}
        </h2>
        <div className="mt-10">
          <LandingFaqAccordion items={items} />
        </div>
      </div>
    </section>
  )
}
