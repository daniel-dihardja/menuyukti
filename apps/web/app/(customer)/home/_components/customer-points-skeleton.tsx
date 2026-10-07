import { Skeleton } from '@workspace/ui/components/skeleton'

export function CustomerPointsSkeleton() {
  return (
    <section className="rounded-lg border border-border bg-canvas/40 px-4 py-5 sm:px-5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mt-4 h-10 w-24" />
      <Skeleton className="mt-4 h-20 w-full" />
    </section>
  )
}
