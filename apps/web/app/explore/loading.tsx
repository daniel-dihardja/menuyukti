import { cn } from '@workspace/ui/lib/utils'

const horizontalPadding =
  'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]'

export default function ExploreLoading() {
  return (
    <div className="relative flex min-h-full min-w-0 flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
      <div
        className={cn(
          'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 py-10 md:gap-10 md:py-14',
          horizontalPadding,
        )}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3">
          <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-full max-w-md animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-[16/10] w-full animate-pulse bg-muted" />
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
