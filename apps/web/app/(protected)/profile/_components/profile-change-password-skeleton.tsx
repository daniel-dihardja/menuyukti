import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

export type ProfileChangePasswordSkeletonProps = {
  /** `form` matches the three-field password layout; `compact` matches OAuth-prompt layout while loading. */
  variant: 'form' | 'compact'
}

export function ProfileChangePasswordSkeleton({ variant }: ProfileChangePasswordSkeletonProps) {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        {variant === 'compact' ? <Skeleton className="mt-2 h-4 w-full max-w-sm" /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {variant === 'form' ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        )}
      </CardContent>
    </Card>
  )
}
