import { Skeleton } from '@workspace/ui/components/skeleton'

export function ProfileChangePasswordSkeleton() {
  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  )
}
