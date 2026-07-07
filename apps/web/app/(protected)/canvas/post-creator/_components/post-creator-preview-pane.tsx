'use client'

import { ImageIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

import {
  POST_IMAGE_ASPECT_RATIO,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from './post-creator-constants'

export type PostCreatorPreviewPaneProps = {
  imageUrl?: string | null
  isLoading?: boolean
}

const previewFrameClassName =
  'w-full max-w-[min(100%,calc((100vh-12rem)*0.8))] overflow-hidden rounded-lg border border-border/60 bg-muted/30'

export function PostCreatorPreviewPane({
  imageUrl,
  isLoading = false,
}: PostCreatorPreviewPaneProps) {
  const t = useTranslations('postCreator.preview')

  const dimensions = t('dimensions', {
    width: POST_IMAGE_WIDTH,
    height: POST_IMAGE_HEIGHT,
  })

  const hasImage = Boolean(imageUrl)

  return (
    <section
      aria-label={t('ariaLabel')}
      className="flex h-full min-h-0 flex-col overflow-hidden p-4"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {isLoading ? (
          <Skeleton
            className={previewFrameClassName}
            style={{ aspectRatio: POST_IMAGE_ASPECT_RATIO }}
          />
        ) : hasImage ? (
          <div className={previewFrameClassName} style={{ aspectRatio: POST_IMAGE_ASPECT_RATIO }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic generated post URLs */}
            <img src={imageUrl!} alt="" className="size-full object-contain" />
          </div>
        ) : (
          <Card
            className="flex size-full max-h-full flex-col items-center justify-center border-dashed bg-muted/20 p-6 text-center"
            style={{
              aspectRatio: POST_IMAGE_ASPECT_RATIO,
              maxWidth: 'min(100%, calc((100vh - 12rem) * 0.8))',
            }}
          >
            <div className="flex max-w-xs flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ImageIcon aria-hidden className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t('emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </div>
          </Card>
        )}
      </div>

      <p className="shrink-0 pt-3 text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{t('dimensionsLabel')}</span>
        {' · '}
        {dimensions}
      </p>
    </section>
  )
}
