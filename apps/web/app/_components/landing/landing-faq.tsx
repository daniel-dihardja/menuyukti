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
      className="bg-muted py-24 [content-visibility:auto]"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        <h2
          id="faq-heading"
          className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
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
