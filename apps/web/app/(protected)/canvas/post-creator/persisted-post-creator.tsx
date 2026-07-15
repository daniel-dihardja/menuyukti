'use client'

import { PostCreatorProvider } from './_context/post-creator-provider'
import { PostCreatorShell } from './_components/post-creator-shell'

export function PersistedPostCreator({ postId }: { postId: string }) {
  return (
    <PostCreatorProvider mode="persisted" postId={postId}>
      <PostCreatorShell />
    </PostCreatorProvider>
  )
}
