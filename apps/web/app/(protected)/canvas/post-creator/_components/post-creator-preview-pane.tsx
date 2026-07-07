'use client'

import { ImageIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { Card } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Switch } from '@workspace/ui/components/switch'

import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y,
  POST_IMAGE_ASPECT_RATIO,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from './post-creator-constants'
import { PostCreatorSafeZoneOverlay } from './post-creator-safe-zone-overlay'

export type PostCreatorPreviewPaneProps = {
  imageUrl?: string | null
  isLoading?: boolean
}

const previewFrameClassName =
  'relative w-full max-w-[min(100%,calc((100vh-12rem)*0.8))] overflow-hidden rounded-lg border border-border/60 bg-muted/30'

const previewFrameStyle = { aspectRatio: POST_IMAGE_ASPECT_RATIO }

export function PostCreatorPreviewPane({
  imageUrl,
  isLoading = false,
}: PostCreatorPreviewPaneProps) {
  const t = useTranslations('postCreator.preview')
  const gridSafeZoneToggleId = useId()
  const [showGridSafeZone, setShowGridSafeZone] = useState(true)

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
          <Skeleton className={previewFrameClassName} style={previewFrameStyle} />
        ) : hasImage ? (
          <div className={previewFrameClassName} style={previewFrameStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic generated post URLs */}
            <img src={imageUrl!} alt="" className="size-full object-contain" />
            {showGridSafeZone ? <PostCreatorSafeZoneOverlay /> : null}
          </div>
        ) : (
          <Card
            className="relative flex size-full max-h-full flex-col items-center justify-center border-dashed bg-muted/20 p-6 text-center"
            style={{
              ...previewFrameStyle,
              maxWidth: 'min(100%, calc((100vh - 12rem) * 0.8))',
            }}
          >
            <div className="relative z-0 flex max-w-xs flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ImageIcon aria-hidden className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t('emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </div>
            {showGridSafeZone ? <PostCreatorSafeZoneOverlay /> : null}
          </Card>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          <span className="font-medium text-foreground">{t('dimensionsLabel')}</span>
          {' · '}
          {dimensions}
        </p>
        <div className="flex items-center justify-center gap-2 sm:justify-end">
          <Label
            htmlFor={gridSafeZoneToggleId}
            className="text-sm font-normal text-muted-foreground"
          >
            {t('gridSafeZoneToggle')}
          </Label>
          <Switch
            id={gridSafeZoneToggleId}
            checked={showGridSafeZone}
            onCheckedChange={setShowGridSafeZone}
            aria-describedby={`${gridSafeZoneToggleId}-description`}
          />
          <span id={`${gridSafeZoneToggleId}-description`} className="sr-only">
            {t('gridSafeZoneDescription', {
              insetX: INSTAGRAM_GRID_THUMBNAIL_INSET_X,
              insetY: INSTAGRAM_GRID_THUMBNAIL_INSET_Y,
            })}
          </span>
        </div>
      </div>
    </section>
  )
}
