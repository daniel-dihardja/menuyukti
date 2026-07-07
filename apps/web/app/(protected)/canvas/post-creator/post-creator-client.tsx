'use client'

import { useTranslations } from 'next-intl'

import { PostCreatorLayout } from './_components/post-creator-layout'
import { PostCreatorPreviewPane } from './_components/post-creator-preview-pane'

export function PostCreatorClient() {
  const t = useTranslations('postCreator')

  return (
    <PostCreatorLayout
      thumbnailsPane={<section aria-label={t('thumbnailsPane')} className="h-full min-h-0" />}
      previewPane={<PostCreatorPreviewPane imageUrl={null} />}
      chatPane={<section aria-label={t('chatPane')} className="h-full min-h-0" />}
    />
  )
}
