'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

const MediaClient = dynamic(() => import('./media-client').then((m) => m.MediaClient), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[200px] items-center justify-center p-8">
      <Skeleton className="h-8 w-full max-w-md" />
    </div>
  ),
})

export function MediaDynamic() {
  return <MediaClient />
}
