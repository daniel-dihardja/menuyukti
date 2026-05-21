'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'

export type LandingFaqAccordionItem = {
  question: string
  answer: string
}

type LandingFaqAccordionProps = {
  items: LandingFaqAccordionItem[]
}

export function LandingFaqAccordion({ items }: LandingFaqAccordionProps) {
  return (
    <Accordion type="single" collapsible className="flex w-full flex-col gap-3">
      {items.map((item, index) => (
        <AccordionItem
          key={item.question}
          value={`faq-${index}`}
          className="rounded-lg border border-border border-b bg-card px-4 shadow-sm last:border-b"
        >
          <AccordionTrigger className="py-3 text-base font-medium leading-snug hover:no-underline md:text-lg md:leading-snug [&>svg]:size-4">
            <span className="min-w-0 text-left text-pretty">{item.question}</span>
          </AccordionTrigger>
          <AccordionContent className="text-base leading-relaxed text-muted-foreground">
            <p className="text-pretty pb-1">{item.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
