import { Skeleton } from '@workspace/ui/components/skeleton'

export default function PostsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-full max-w-xs sm:w-40" />
      </div>
      <div className="-mx-4 w-[calc(100%+2rem)] border-x-0 border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
        <div className="flex gap-4 border-b px-4 py-3">
          <Skeleton className="h-4 w-8 shrink-0" />
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 w-36 shrink-0" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div className="flex gap-4 border-b px-4 py-3 last:border-b-0" key={`posts-skel-${i}`}>
            <Skeleton className="h-4 w-8 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 w-36 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
