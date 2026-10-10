import { Skeleton } from '@workspace/ui/components/skeleton'

export function CustomerVotingsSkeleton() {
  return (
    <section className="rounded-lg border border-border bg-canvas/40 px-4 py-5 sm:px-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mt-4 h-28 w-full rounded-md" />
    </section>
  )
}
