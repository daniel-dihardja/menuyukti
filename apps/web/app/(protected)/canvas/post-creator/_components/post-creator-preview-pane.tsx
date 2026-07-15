'use client'

import { ChevronLeft, ChevronRight, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useId, useState, type KeyboardEvent } from 'react'

import { Card } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Switch } from '@workspace/ui/components/switch'
import { Button } from '@workspace/ui/components/button'

import { usePostCreator } from '../_context/use-post-creator'
import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from './post-creator-constants'
import { PostCreatorSafeZoneOverlay } from './post-creator-safe-zone-overlay'
import { PostCreatorVersionFilmstrip } from './post-creator-version-filmstrip'

const previewContentMaxWidthClassName = 'w-full max-w-[min(100%,calc((100vh-12rem)*0.8))]'

const previewShellClassName = `flex min-h-0 min-w-0 flex-1 flex-col items-center gap-2 ${previewContentMaxWidthClassName}`

const previewFrameClassName =
  'relative aspect-[4/5] max-h-full max-w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30'

export function PostCreatorPreviewPane() {
  const t = useTranslations('postCreator.preview')
  const { state, actions, meta } = usePostCreator()
  const {
    imageVersions,
    previewVersionIndex,
    postImageVersionIndex,
    isGenerating: isLoading,
    isCommittingPostImage,
    isDeletingVersion,
  } = state
  const { previewVersion: onPreviewVersionIndex, commitPostImage, requestDelete } = actions
  const {
    previewImageUrl: imageUrl,
    selectedPageMediaS3Key: mediaS3Key,
    canRemoveEmptyPage,
    canDelete,
  } = meta

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
        ? [{ id: 'current', mediaS3Key: mediaS3Key ?? '', imageUrl, createdAt: '' }]
        : []
  const previewVersion = versions[previewVersionIndex] ?? versions[0]
  const previewImageUrl = previewVersion?.imageUrl ?? null
  const hasImage = Boolean(previewImageUrl)
  const showLoadingPlaceholder = isLoading && !hasImage
  const showVersionNav = versions.length > 1
  const canCommitPostImage = showVersionNav && previewVersionIndex !== postImageVersionIndex

  const onDeleteVersion = canDelete ? requestDelete : undefined
  const onUseAsPostImage = canCommitPostImage ? () => void commitPostImage() : undefined

  const canDeleteVersion =
    hasImage &&
    Boolean(onDeleteVersion) &&
    Boolean(previewVersion?.mediaS3Key) &&
    !isLoading &&
    !isCommittingPostImage &&
    !isDeletingVersion

  const canRemovePage =
    !hasImage &&
    canRemoveEmptyPage &&
    Boolean(onDeleteVersion) &&
    !isLoading &&
    !isCommittingPostImage &&
    !isDeletingVersion

  const showRemoveButton = canDeleteVersion || canRemovePage

  const previewVersionAt = useCallback(
    (index: number) => {
      if (isCommittingPostImage || isLoading || isDeletingVersion) return
      onPreviewVersionIndex(index)
    },
    [isCommittingPostImage, isDeletingVersion, isLoading, onPreviewVersionIndex],
  )

  const goPrev = useCallback(() => {
    if (isCommittingPostImage || isLoading || isDeletingVersion) return
    previewVersionAt(previewVersionIndex === 0 ? versions.length - 1 : previewVersionIndex - 1)
  }, [
    isCommittingPostImage,
    isDeletingVersion,
    isLoading,
    previewVersionAt,
    previewVersionIndex,
    versions.length,
  ])

  const goNext = useCallback(() => {
    if (isCommittingPostImage || isLoading || isDeletingVersion) return
    previewVersionAt(previewVersionIndex === versions.length - 1 ? 0 : previewVersionIndex + 1)
  }, [
    isCommittingPostImage,
    isDeletingVersion,
    isLoading,
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
      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden px-2 py-3">
        {showLoadingPlaceholder ? (
          <div
            className={`flex min-h-0 flex-1 items-center justify-center ${previewContentMaxWidthClassName}`}
          >
            <Skeleton className={`w-full ${previewFrameClassName}`} />
          </div>
        ) : hasImage ? (
          <div
            className={`flex min-h-0 flex-1 flex-col items-center gap-3 ${previewContentMaxWidthClassName}`}
            onKeyDown={handlePreviewKeyDown}
            tabIndex={showVersionNav ? 0 : undefined}
          >
            <div className="flex min-h-0 w-full flex-1 items-stretch justify-center gap-2">
              {showVersionNav ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={goPrev}
                  disabled={isCommittingPostImage || isLoading || isDeletingVersion}
                  className="size-9 shrink-0 self-center rounded-full shadow-sm"
                  aria-label={t('previousVersion')}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
              ) : null}
              <div className={previewShellClassName}>
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <div className={previewFrameClassName}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic generated post URLs */}
                    <img
                      src={previewImageUrl!}
                      alt={t('previewImageAlt')}
                      width={POST_IMAGE_WIDTH}
                      height={POST_IMAGE_HEIGHT}
                      className="size-full object-contain"
                    />
                    {isLoading ? (
                      <div
                        className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background/60"
                        aria-live="polite"
                      >
                        <Loader2
                          className="size-8 animate-spin text-muted-foreground"
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t('generating')}
                        </span>
                      </div>
                    ) : null}
                    {isDeletingVersion ? (
                      <div
                        className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background/60"
                        aria-live="polite"
                      >
                        <Loader2
                          className="size-8 animate-spin text-muted-foreground"
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t('deleteImageDeleting')}
                        </span>
                      </div>
                    ) : null}
                    {showGridSafeZone ? <PostCreatorSafeZoneOverlay /> : null}
                    {showRemoveButton ? (
                      <div className="absolute top-2 right-2 z-40">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={onDeleteVersion}
                          className="size-8 shadow-sm"
                          aria-label={t('deleteImage')}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
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
                </div>
                {showVersionNav ? (
                  <p
                    className="shrink-0 pt-1 text-xs font-medium text-muted-foreground"
                    aria-live="polite"
                  >
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
                  disabled={isCommittingPostImage || isLoading || isDeletingVersion}
                  className="size-9 shrink-0 self-center rounded-full shadow-sm"
                  aria-label={t('nextVersion')}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
            {showVersionNav ? (
              <div className="w-full shrink-0">
                <PostCreatorVersionFilmstrip
                  versions={versions}
                  previewIndex={previewVersionIndex}
                  postImageIndex={postImageVersionIndex}
                  onPreviewIndex={previewVersionAt}
                  isCommitting={isCommittingPostImage || isLoading || isDeletingVersion}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={`flex min-h-0 flex-1 items-center justify-center ${previewContentMaxWidthClassName}`}
          >
            <Card
              className={`relative flex w-full flex-col items-center justify-center border-dashed bg-muted/20 p-6 text-center ${previewFrameClassName}`}
            >
              {showRemoveButton ? (
                <div className="absolute top-2 right-2 z-40">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={onDeleteVersion}
                    className="size-8 shadow-sm"
                    aria-label={t('removePage')}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ) : null}
              <div className="relative z-0 flex max-w-xs flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ImageIcon aria-hidden className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">{t('emptyTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
              </div>
              {showGridSafeZone ? <PostCreatorSafeZoneOverlay /> : null}
            </Card>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          <span className="font-medium text-foreground">{t('formatLabel')}</span>
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
