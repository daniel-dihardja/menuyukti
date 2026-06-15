type TrustStripProps = {
  title: string
  stats: ReadonlyArray<{ value: string; label: string }>
}

export function LandingTrustStrip({ title, stats }: TrustStripProps) {
  return (
    <section
      id="trust"
      className="border-y border-border bg-muted/40 py-12"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="trust-heading"
          className="mb-8 text-center text-base font-medium uppercase tracking-wider text-muted-foreground"
        >
          {title}
        </h2>
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-8 sm:gap-x-12 lg:gap-x-10">
          {stats.map((s) => (
            <li
              key={s.label}
              className="flex min-w-[9rem] max-w-[14rem] flex-col items-center text-center"
            >
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl">
                {s.value}
              </span>
              <span className="mt-1.5 max-w-[14rem] text-base leading-snug text-muted-foreground">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
