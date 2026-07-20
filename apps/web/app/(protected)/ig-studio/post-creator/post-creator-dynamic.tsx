'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

const loadingFallback = (
  <div className="flex min-h-[200px] items-center justify-center p-8">
    <Skeleton className="h-8 w-full max-w-md" />
  </div>
)

const PersistedPostCreator = dynamic(
  () => import('./persisted-post-creator').then((m) => m.PersistedPostCreator),
  { ssr: false, loading: () => loadingFallback },
)

const EphemeralPostCreator = dynamic(
  () => import('./ephemeral-post-creator').then((m) => m.EphemeralPostCreator),
  { ssr: false, loading: () => loadingFallback },
)

/** @deprecated Use PersistedPostCreator or EphemeralPostCreator instead. */
export function PostCreatorDynamic({ postId }: { postId: string | null }) {
  if (postId) {
    return <PersistedPostCreator postId={postId} />
  }
  return <EphemeralPostCreator />
}

export { PersistedPostCreator, EphemeralPostCreator }
