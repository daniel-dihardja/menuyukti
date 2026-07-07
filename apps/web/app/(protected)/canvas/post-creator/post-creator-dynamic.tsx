'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

const PostCreatorClient = dynamic(
  () => import('./post-creator-client').then((m) => m.PostCreatorClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <Skeleton className="h-8 w-full max-w-md" />
      </div>
    ),
  },
)

export function PostCreatorDynamic() {
  return <PostCreatorClient />
}
