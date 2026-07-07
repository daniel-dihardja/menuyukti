'use client'

import { useTranslations } from 'next-intl'

import { PostCreatorLayout } from './_components/post-creator-layout'

export function PostCreatorClient() {
  const t = useTranslations('postCreator')

  return (
    <PostCreatorLayout
      thumbnailsPane={<section aria-label={t('thumbnailsPane')} className="h-full min-h-0" />}
      previewPane={<section aria-label={t('previewPane')} className="h-full min-h-0" />}
      chatPane={<section aria-label={t('chatPane')} className="h-full min-h-0" />}
    />
  )
}
