'use client'

import { EphemeralPostCreator } from './ephemeral-post-creator'
import { PersistedPostCreator } from './persisted-post-creator'

export { EphemeralPostCreator, PersistedPostCreator }

/** @deprecated Use PersistedPostCreator or EphemeralPostCreator instead. */
export function PostCreatorClient({ postId }: { postId: string | null }) {
  if (postId) {
    return <PersistedPostCreator postId={postId} />
  }
  return <EphemeralPostCreator />
}
