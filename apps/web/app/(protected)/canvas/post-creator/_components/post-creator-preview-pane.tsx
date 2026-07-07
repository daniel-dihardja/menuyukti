'use client'

import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useId, useState, type KeyboardEvent } from 'react'

import { Card } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Switch } from '@workspace/ui/components/switch'
import { Button } from '@workspace/ui/components/button'

import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y,
  POST_IMAGE_ASPECT_RATIO,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from './post-creator-constants'
import type { PostCreatorImageVersion } from './post-creator-thumbnails-pane'
import { PostCreatorSafeZoneOverlay } from './post-creator-safe-zone-overlay'
import { PostCreatorVersionFilmstrip } from './post-creator-version-filmstrip'

export type PostCreatorPreviewPaneProps = {
  imageUrl?: string | null
  imageVersions?: PostCreatorImageVersion[]
  previewVersionIndex?: number
  postImageVersionIndex?: number
  onPreviewVersionIndex?: (index: number) => void
  onUseAsPostImage?: () => void
  isLoading?: boolean
  isCommittingPostImage?: boolean
}

const previewShellClassName = 'w-full max-w-[min(100%,calc((100vh-12rem)*0.8))]'

const previewFrameClassName =
  'relative w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30'

const previewFrameStyle = { aspectRatio: POST_IMAGE_ASPECT_RATIO }

export function PostCreatorPreviewPane({
  imageUrl,
  imageVersions = [],
  previewVersionIndex = 0,
  postImageVersionIndex = 0,
  onPreviewVersionIndex,
  onUseAsPostImage,
  isLoading = false,
  isCommittingPostImage = false,
}: PostCreatorPreviewPaneProps) {
  const t = useTranslations('postCreator.preview')
  const gridSafeZoneToggleId = useId()
  const [showGridSafeZone, setShowGridSafeZone] = useState(true)

  const dimensions = t('dimensions', {
    width: POST_IMAGE_WIDTH,
    height: POST_IMAGE_HEIGHT,
  })

  const versions =
    imageVersions.length > 0
      ? imageVersions
      : imageUrl
        ? [{ id: 'current', mediaS3Key: '', imageUrl, createdAt: '' }]
        : []
  const previewVersion = versions[previewVersionIndex] ?? versions[0]
  const previewImageUrl = previewVersion?.imageUrl ?? null
  const hasImage = Boolean(previewImageUrl)
  const showVersionNav = versions.length > 1 && onPreviewVersionIndex
  const canCommitPostImage =
    showVersionNav && onUseAsPostImage && previewVersionIndex !== postImageVersionIndex

  const previewVersionAt = useCallback(
    (index: number) => {
      if (!onPreviewVersionIndex || isCommittingPostImage) return
      onPreviewVersionIndex(index)
    },
    [isCommittingPostImage, onPreviewVersionIndex],
  )

  const goPrev = useCallback(() => {
    if (!onPreviewVersionIndex || isCommittingPostImage) return
    previewVersionAt(previewVersionIndex === 0 ? versions.length - 1 : previewVersionIndex - 1)
  }, [
    isCommittingPostImage,
    onPreviewVersionIndex,
    previewVersionAt,
    previewVersionIndex,
    versions.length,
  ])

  const goNext = useCallback(() => {
    if (!onPreviewVersionIndex || isCommittingPostImage) return
    previewVersionAt(previewVersionIndex === versions.length - 1 ? 0 : previewVersionIndex + 1)
  }, [
    isCommittingPostImage,
    onPreviewVersionIndex,
    previewVersionAt,
    previewVersionIndex,
    versions.length,
  ])

  const handlePreviewKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!showVersionNav) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    },
    [goNext, goPrev, showVersionNav],
  )

  return (
    <section
      aria-label={t('ariaLabel')}
      className="flex h-full min-h-0 flex-col overflow-hidden p-4"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {isLoading ? (
          <Skeleton
            className={`${previewShellClassName} ${previewFrameClassName}`}
            style={previewFrameStyle}
          />
        ) : hasImage ? (
          <div
            className="flex w-full flex-col items-center gap-3"
            onKeyDown={handlePreviewKeyDown}
            tabIndex={showVersionNav ? 0 : undefined}
          >
            <div className="flex w-full items-center justify-center gap-2">
              {showVersionNav ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={goPrev}
                  disabled={isCommittingPostImage}
                  className="size-9 shrink-0 rounded-full shadow-sm"
                  aria-label={t('previousVersion')}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
              ) : null}
              <div className={`flex min-w-0 flex-col items-center gap-2 ${previewShellClassName}`}>
                <div className={previewFrameClassName} style={previewFrameStyle}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic generated post URLs */}
                  <img src={previewImageUrl!} alt="" className="size-full object-contain" />
                  {showGridSafeZone ? <PostCreatorSafeZoneOverlay /> : null}
                  {canCommitPostImage ? (
                    <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
                      <Button
                        type="button"
                        onClick={onUseAsPostImage}
                        disabled={isCommittingPostImage}
                        className="shadow-md"
                      >
                        {isCommittingPostImage
                          ? t('useAsPostImageCommitting')
                          : t('useAsPostImage')}
                      </Button>
                    </div>
                  ) : null}
                </div>
                {showVersionNav ? (
                  <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                    {t('versionIndicator', {
                      current: previewVersionIndex + 1,
                      total: versions.length,
                    })}
                  </p>
                ) : null}
              </div>
              {showVersionNav ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={goNext}
                  disabled={isCommittingPostImage}
                  className="size-9 shrink-0 rounded-full shadow-sm"
                  aria-label={t('nextVersion')}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
            {showVersionNav ? (
              <PostCreatorVersionFilmstrip
                versions={versions}
                previewIndex={previewVersionIndex}
                postImageIndex={postImageVersionIndex}
                onPreviewIndex={previewVersionAt}
                isCommitting={isCommittingPostImage}
              />
            ) : null}
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
