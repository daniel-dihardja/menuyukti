import { Skeleton } from '@workspace/ui/components/skeleton'

export type ProfileChangePasswordSkeletonProps = {
  /** `form` matches the three-field password layout; `compact` matches OAuth-prompt layout while loading. */
  variant: 'form' | 'compact'
}

export function ProfileChangePasswordSkeleton({ variant }: ProfileChangePasswordSkeletonProps) {
  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        {variant === 'compact' ? <Skeleton className="h-4 w-full max-w-sm" /> : null}
      </div>
      <div className="space-y-3">
        {variant === 'form' ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-32" />
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-9 w-40" />
          </>
        )}
      </div>
    </div>
  )
}
