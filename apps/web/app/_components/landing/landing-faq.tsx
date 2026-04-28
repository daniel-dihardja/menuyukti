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
        <div className="mt-10 flex flex-col gap-3">
          {items.map((item) => (
            <details
              key={item.question}
              className="group rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
            >
              <summary className="cursor-pointer list-none text-base font-medium leading-snug text-foreground outline-none transition-colors marker:content-none md:text-lg md:leading-snug [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {item.question}
                  <span
                    className="text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  >
                    ▾
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
