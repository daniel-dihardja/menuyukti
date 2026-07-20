'use client'

import { PostCreatorLayout } from './post-creator-layout'
import { PostCreatorDeleteDialog } from './post-creator-delete-dialog'
import { PostCreatorPreviewPane } from './post-creator-preview-pane'
import { PostCreatorRightPane } from './post-creator-right-pane'
import { PostCreatorThumbnailsPane } from './post-creator-thumbnails-pane'
import { usePostCreator } from '../_context/use-post-creator'

export function PostCreatorShell() {
  const { meta } = usePostCreator()

  return (
    <div
      className="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
      data-post-id={meta.postId ?? undefined}
    >
      <PostCreatorLayout
        thumbnailsPane={<PostCreatorThumbnailsPane />}
        previewPane={<PostCreatorPreviewPane />}
        promptPane={<PostCreatorRightPane />}
      />
      <PostCreatorDeleteDialog />
    </div>
  )
}
