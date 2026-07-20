'use client'

import { PostCreatorProvider } from './_context/post-creator-provider'
import { PostCreatorShell } from './_components/post-creator-shell'

export function EphemeralPostCreator() {
  return (
    <PostCreatorProvider mode="ephemeral" postId={null}>
      <PostCreatorShell />
    </PostCreatorProvider>
  )
}
