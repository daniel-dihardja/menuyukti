type JsonLdProps = {
  data: Record<string, unknown> | ReadonlyArray<Record<string, unknown>>
}

/** Server Component: emits a single JSON-LD script for search / answer engines. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
