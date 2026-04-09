type HeroProductPreviewProps = {
  workflowCardTitle: string
}

/** Decorative product-style preview for the hero (no live data). */
export function HeroProductPreview({ workflowCardTitle }: HeroProductPreviewProps) {
  return (
    <div
      className="relative mx-auto mt-12 w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="size-3 rounded-full bg-red-500/80" />
        <span className="size-3 rounded-full bg-amber-500/80" />
        <span className="size-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 h-2 flex-1 rounded bg-muted" />
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_200px] md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2 md:gap-3">
            {[40, 65, 90, 55, 75, 50].map((h, i) => (
              <div
                key={i}
                className="w-full max-w-[48px] rounded-t-md bg-primary/80"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-left text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 font-medium text-foreground">Top movers</div>
              <div className="space-y-1">
                <div className="h-2 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 font-medium text-foreground">{workflowCardTitle}</div>
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-muted" />
                <div className="h-2 w-2/3 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="aspect-square w-full rounded-md bg-gradient-to-br from-primary/20 to-primary/5" />
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-2 w-4/5 rounded bg-muted" />
          <div className="mt-auto flex gap-1">
            <div className="h-8 flex-1 rounded bg-primary/15" />
            <div className="h-8 flex-1 rounded bg-primary/15" />
            <div className="h-8 flex-1 rounded bg-primary/15" />
          </div>
        </div>
      </div>
    </div>
  )
}
