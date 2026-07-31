'use client'

import { ChevronLeft, ChevronRight, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  createContext,
  use,
  useCallback,
  useId,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Switch } from '@workspace/ui/components/switch'
import { Button } from '@workspace/ui/components/button'

import {
  formatAspectCss,
  formatAspectNumber,
  resolveLeonardoOutputDimensions,
} from '@/lib/posts/leonardo-post-dimensions'

import type { PostCreatorImageVersion } from '../_context/types'
import { usePostCreator } from '../_context/use-post-creator'
import {
  clampSafeZoneInsetPx,
  normalizeSolidBackgroundColor,
  safeZoneInsetPercents,
} from './post-creator-constants'
import { PostCreatorSafeZoneOverlay } from './post-creator-safe-zone-overlay'
import { PostCreatorVersionFilmstrip } from './post-creator-version-filmstrip'

/** Viewport-approx chrome so max-width can track format ratio (not hardcoded 4:5). */
const PREVIEW_AVAILABLE_HEIGHT = '100vh - 12rem'

const previewFrameBaseClassName =
  'relative max-h-full max-w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30'

type PreviewLayout = {
  aspectCss: string
  previewContentStyle: CSSProperties
  previewFrameClassName: string
  previewFrameStyle: CSSProperties
  previewShellClassName: string
  resolved: { width: number; height: number }
  formatName: string
  qualityName: string
  clampedInsetXPx: number
  clampedInsetYPx: number
  safeZoneOverlay: ReactNode
}

type PreviewChromeValue = {
  layout: PreviewLayout
  showSafeZone: boolean
  setShowSafeZone: (value: boolean) => void
  safeZoneToggleId: string
}

const PreviewChromeContext = createContext<PreviewChromeValue | null>(null)

function usePreviewChrome(): PreviewChromeValue {
  const ctx = use(PreviewChromeContext)
  if (!ctx) throw new Error('usePreviewChrome must be used within PreviewPaneFrame')
  return ctx
}

function usePreviewLayout(showSafeZone: boolean): PreviewLayout {
  const tPrompt = useTranslations('postCreator.prompt')
  const { state } = usePostCreator()
  const { imageFormat, imageQuality, generationModel, safeZoneInsetXPx, safeZoneInsetYPx } = state

  const resolved = resolveLeonardoOutputDimensions({
    model: generationModel,
    format: imageFormat,
    quality: imageQuality,
  })
  const aspectCss = formatAspectCss(imageFormat)
  const aspectNumber = formatAspectNumber(imageFormat)
  const isPortraitFormat = aspectNumber < 1
  const clampedInsetXPx = clampSafeZoneInsetPx(safeZoneInsetXPx, resolved.width)
  const clampedInsetYPx = clampSafeZoneInsetPx(safeZoneInsetYPx, resolved.height)
  const { insetXPercent, insetYPercent } = safeZoneInsetPercents(
    clampedInsetXPx,
    clampedInsetYPx,
    resolved.width,
    resolved.height,
  )

  return {
    aspectCss,
    previewContentStyle: {
      maxWidth: `min(100%, calc((${PREVIEW_AVAILABLE_HEIGHT}) * ${aspectNumber}))`,
    },
    previewFrameClassName: previewFrameBaseClassName,
    previewFrameStyle: {
      aspectRatio: aspectCss,
      ...(isPortraitFormat ? { height: '100%', width: 'auto' } : { width: '100%', height: 'auto' }),
    },
    previewShellClassName: 'flex min-h-0 min-w-0 w-full flex-1 flex-col items-center gap-2',
    resolved,
    formatName: tPrompt(`format.options.${imageFormat}.name`),
    qualityName: tPrompt(`quality.options.${imageQuality}.name`),
    clampedInsetXPx,
    clampedInsetYPx,
    safeZoneOverlay: showSafeZone ? (
      <PostCreatorSafeZoneOverlay
        insetXPercent={insetXPercent}
        insetYPercent={insetYPercent}
        insetXPx={clampedInsetXPx}
        insetYPx={clampedInsetYPx}
      />
    ) : null,
  }
}

function PreviewPaneFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('postCreator.preview')
  const [showSafeZone, setShowSafeZone] = useState(true)
  const safeZoneToggleId = useId()
  const layout = usePreviewLayout(showSafeZone)

  return (
    <PreviewChromeContext value={{ layout, showSafeZone, setShowSafeZone, safeZoneToggleId }}>
      <section
        aria-label={t('ariaLabel')}
        className="flex h-full min-h-0 flex-col overflow-hidden p-4"
      >
        <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden px-2 py-3">
          {children}
        </div>

        <div className="flex shrink-0 flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            {t('formatQualitySummary', {
              format: layout.formatName,
              quality: layout.qualityName,
              width: layout.resolved.width,
              height: layout.resolved.height,
            })}
          </p>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <Label htmlFor={safeZoneToggleId} className="text-sm font-normal text-muted-foreground">
              {t('safeZoneToggle')}
            </Label>
            <Switch
              id={safeZoneToggleId}
              checked={showSafeZone}
              onCheckedChange={setShowSafeZone}
              aria-describedby={`${safeZoneToggleId}-description`}
            />
            <span id={`${safeZoneToggleId}-description`} className="sr-only">
              {t('safeZoneDescription', {
                insetX: layout.clampedInsetXPx,
                insetY: layout.clampedInsetYPx,
              })}
            </span>
          </div>
        </div>
      </section>
    </PreviewChromeContext>
  )
}

function PreviewBusyOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background/60"
      aria-live="polite"
    >
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function PreviewRemoveButton({ onClick, ariaLabel }: { onClick?: () => void; ariaLabel: string }) {
  if (!onClick) return null
  return (
    <div className="absolute top-2 right-2 z-40">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={onClick}
        className="size-8 shadow-sm"
        aria-label={ariaLabel}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

function PreviewVersionNavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled: boolean
}) {
  const t = useTranslations('postCreator.preview')
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="size-9 shrink-0 self-center rounded-full shadow-sm"
      aria-label={direction === 'prev' ? t('previousVersion') : t('nextVersion')}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  )
}

function PreviewVersionActions({
  showRemove,
  showCommit,
  onDelete,
  onCommit,
  isCommitting,
}: {
  showRemove: boolean
  showCommit: boolean
  onDelete?: () => void
  onCommit?: () => void
  isCommitting: boolean
}) {
  const t = useTranslations('postCreator.preview')
  return (
    <>
      {showRemove ? <PreviewRemoveButton onClick={onDelete} ariaLabel={t('deleteImage')} /> : null}
      {showCommit ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
          <Button type="button" onClick={onCommit} disabled={isCommitting} className="shadow-md">
            {isCommitting ? t('useAsPostImageCommitting') : t('useAsPostImage')}
          </Button>
        </div>
      ) : null}
    </>
  )
}

function PreviewFilmstrip({
  versions,
  previewIndex,
  postImageIndex,
  onPreviewIndex,
  isBusy,
}: {
  versions: PostCreatorImageVersion[]
  previewIndex: number
  postImageIndex: number
  onPreviewIndex: (index: number) => void
  isBusy: boolean
}) {
  const {
    layout: { aspectCss, resolved },
  } = usePreviewChrome()

  if (versions.length <= 1) return null

  return (
    <div className="w-full shrink-0">
      <PostCreatorVersionFilmstrip
        versions={versions}
        previewIndex={previewIndex}
        postImageIndex={postImageIndex}
        aspectRatio={aspectCss}
        outputWidth={resolved.width}
        outputHeight={resolved.height}
        onPreviewIndex={onPreviewIndex}
        isCommitting={isBusy}
      />
    </div>
  )
}

function GeneratingPreview() {
  const {
    layout: { previewContentStyle, previewFrameClassName, previewFrameStyle },
  } = usePreviewChrome()

  return (
    <div
      className="flex min-h-0 w-full flex-1 items-center justify-center"
      style={previewContentStyle}
    >
      <Skeleton className={previewFrameClassName} style={previewFrameStyle} />
    </div>
  )
}

function VersionedPreview() {
  const t = useTranslations('postCreator.preview')
  const { state, actions, meta } = usePostCreator()
  const {
    layout: {
      previewContentStyle,
      previewFrameClassName,
      previewFrameStyle,
      previewShellClassName,
      safeZoneOverlay,
    },
  } = usePreviewChrome()

  const {
    imageVersions,
    previewVersionIndex,
    postImageVersionIndex,
    isGenerating: isLoading,
    isCommittingPostImage,
    isDeletingVersion,
  } = state
  const { previewVersion: onPreviewVersionIndex, commitPostImage, requestDelete } = actions
  const { canDelete } = meta

  const versions = imageVersions.length > 0 ? imageVersions : []
  const previewVersion = versions[previewVersionIndex] ?? versions[0]
  const previewImageUrl = previewVersion?.imageUrl ?? null
  const showVersionNav = versions.length > 1
  const canCommitPostImage =
    Boolean(previewImageUrl) && showVersionNav && previewVersionIndex !== postImageVersionIndex
  const onDeleteVersion = canDelete ? requestDelete : undefined
  const onUseAsPostImage = canCommitPostImage ? () => void commitPostImage() : undefined
  const isBusy = isCommittingPostImage || isLoading || isDeletingVersion

  const canDeleteVersion =
    Boolean(previewImageUrl) &&
    Boolean(onDeleteVersion) &&
    Boolean(previewVersion?.mediaS3Key) &&
    !isBusy

  const previewVersionAt = useCallback(
    (index: number) => {
      if (isBusy) return
      onPreviewVersionIndex(index)
    },
    [isBusy, onPreviewVersionIndex],
  )

  const goPrev = useCallback(() => {
    if (isBusy) return
    previewVersionAt(previewVersionIndex === 0 ? versions.length - 1 : previewVersionIndex - 1)
  }, [isBusy, previewVersionAt, previewVersionIndex, versions.length])

  const goNext = useCallback(() => {
    if (isBusy) return
    previewVersionAt(previewVersionIndex === versions.length - 1 ? 0 : previewVersionIndex + 1)
  }, [isBusy, previewVersionAt, previewVersionIndex, versions.length])

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
    <div
      className="flex min-h-0 w-full flex-1 flex-col items-center gap-3"
      style={previewContentStyle}
      onKeyDown={handlePreviewKeyDown}
      tabIndex={showVersionNav ? 0 : undefined}
    >
      <div className="flex min-h-0 w-full flex-1 items-stretch justify-center gap-2">
        {showVersionNav ? (
          <PreviewVersionNavButton direction="prev" onClick={goPrev} disabled={isBusy} />
        ) : null}
        <div className={previewShellClassName}>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className={previewFrameClassName} style={previewFrameStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic generated post URLs */}
              <img
                src={previewImageUrl!}
                alt={t('previewImageAlt')}
                className="size-full object-contain"
              />
              {isLoading ? <PreviewBusyOverlay label={t('generating')} /> : null}
              {isDeletingVersion ? <PreviewBusyOverlay label={t('deleteImageDeleting')} /> : null}
              {safeZoneOverlay}
              <PreviewVersionActions
                showRemove={canDeleteVersion}
                showCommit={canCommitPostImage}
                onDelete={onDeleteVersion}
                onCommit={onUseAsPostImage}
                isCommitting={isCommittingPostImage}
              />
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
          <PreviewVersionNavButton direction="next" onClick={goNext} disabled={isBusy} />
        ) : null}
      </div>
      <PreviewFilmstrip
        versions={versions}
        previewIndex={previewVersionIndex}
        postImageIndex={postImageVersionIndex}
        onPreviewIndex={previewVersionAt}
        isBusy={isBusy}
      />
    </div>
  )
}

function EmptyPreviewFrame({
  children,
  solidBackground,
}: {
  children?: ReactNode
  solidBackground?: boolean
}) {
  const {
    layout: { previewContentStyle, previewFrameClassName, previewFrameStyle, safeZoneOverlay },
  } = usePreviewChrome()
  const t = useTranslations('postCreator.preview')
  const { state, actions, meta } = usePostCreator()
  const {
    isGenerating: isLoading,
    isCommittingPostImage,
    isDeletingVersion,
    solidBackgroundColor,
  } = state
  const { requestDelete } = actions
  const { canRemoveEmptyPage, canDelete } = meta

  const onDeleteVersion = canDelete ? requestDelete : undefined
  const canRemovePage =
    canRemoveEmptyPage &&
    Boolean(onDeleteVersion) &&
    !isLoading &&
    !isCommittingPostImage &&
    !isDeletingVersion

  return (
    <div
      className="flex min-h-0 w-full flex-1 items-center justify-center"
      style={previewContentStyle}
    >
      <div
        className={`border-dashed ${previewFrameClassName} ${
          solidBackground ? 'border-border/40' : 'bg-muted/20'
        }`}
        style={{
          ...previewFrameStyle,
          ...(solidBackground
            ? { backgroundColor: normalizeSolidBackgroundColor(solidBackgroundColor) }
            : null),
        }}
      >
        {canRemovePage ? (
          <PreviewRemoveButton onClick={onDeleteVersion} ariaLabel={t('removePage')} />
        ) : null}
        {children}
        {safeZoneOverlay}
      </div>
    </div>
  )
}

function SolidBackgroundPreview() {
  return <EmptyPreviewFrame solidBackground />
}

function EmptyPreview() {
  const t = useTranslations('postCreator.preview')

  return (
    <EmptyPreviewFrame>
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ImageIcon aria-hidden className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t('emptyTitle')}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">{t('emptyDescription')}</p>
      </div>
    </EmptyPreviewFrame>
  )
}

function PreviewPaneBody() {
  const { state } = usePostCreator()
  const {
    imageVersions,
    previewVersionIndex,
    isGenerating: isLoading,
    solidBackgroundEnabled,
  } = state

  const versions = imageVersions.length > 0 ? imageVersions : []
  const previewVersion = versions[previewVersionIndex] ?? versions[0]
  const hasImage = Boolean(previewVersion?.imageUrl)
  const showLoadingPlaceholder = isLoading && !hasImage

  if (showLoadingPlaceholder) return <GeneratingPreview />
  if (hasImage) return <VersionedPreview />
  if (solidBackgroundEnabled) return <SolidBackgroundPreview />
  return <EmptyPreview />
}

export function PostCreatorPreviewPane() {
  return (
    <PreviewPaneFrame>
      <PreviewPaneBody />
    </PreviewPaneFrame>
  )
}
