'use client'

import { useTranslations } from 'next-intl'

import { PostCreatorLayout } from './_components/post-creator-layout'
import { PostCreatorPreviewPane } from './_components/post-creator-preview-pane'

export function PostCreatorClient({ postId }: { postId: string | null }) {
  const t = useTranslations('postCreator')

  return (
    <div
      className="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
      data-post-id={postId ?? undefined}
    >
      <PostCreatorLayout
        thumbnailsPane={<section aria-label={t('thumbnailsPane')} className="h-full min-h-0" />}
        previewPane={<PostCreatorPreviewPane imageUrl={null} />}
        chatPane={<section aria-label={t('chatPane')} className="h-full min-h-0" />}
      />
    </div>
  )
}
