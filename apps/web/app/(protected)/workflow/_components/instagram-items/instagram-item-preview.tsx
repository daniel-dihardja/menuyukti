'use client'

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, Trash2Icon, XIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { Field, FieldDescription } from '@workspace/ui/components/field'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { InstagramItemDefaultImage } from './instagram-item-default-image'
import type { InstagramItemKind } from './use-instagram-items'

export type InstagramItemPreviewVersion = {
  id: string
  mediaS3Key: string
  imageUrl: string | null
}

type InstagramItemPreviewProps = {
  kind: InstagramItemKind
  versions: InstagramItemPreviewVersion[]
  previewIndex: number
  committedIndex: number
  busy: boolean
  isGenerating: boolean
  isCommitting: boolean
  canDeleteVersion: boolean
  onPreviewIndexChange: (index: number) => void
  onCommit: () => void
  onRequestDelete: () => void
}

function previewAspectClass(kind: InstagramItemKind): string {
  if (kind === 'post') return 'aspect-square'
  return 'aspect-[9/16]'
}

export function InstagramItemPreview({
  kind,
  versions,
  previewIndex,
  committedIndex,
  busy,
  isGenerating,
  isCommitting,
  canDeleteVersion,
  onPreviewIndexChange,
  onCommit,
  onRequestDelete,
}: InstagramItemPreviewProps) {
  const t = useTranslations('analytics.workflows.instagramItems')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false)

  const showVersionNav = versions.length > 1
  const previewVersion = versions[previewIndex] ?? versions[0]
  const previewUrl = previewVersion?.imageUrl ?? null
  const canExpand = Boolean(previewUrl) && !isGenerating
  const canCommit =
    Boolean(previewVersion?.mediaS3Key) && showVersionNav && previewIndex !== committedIndex

  useEffect(() => {
    setLightboxImageLoaded(false)
  }, [previewUrl, lightboxOpen])

  useEffect(() => {
    if (!previewUrl && lightboxOpen) {
      setLightboxOpen(false)
    }
  }, [lightboxOpen, previewUrl])

  const goPrev = useCallback(() => {
    if (!showVersionNav || busy) return
    onPreviewIndexChange(previewIndex === 0 ? versions.length - 1 : previewIndex - 1)
  }, [busy, onPreviewIndexChange, previewIndex, showVersionNav, versions.length])

  const goNext = useCallback(() => {
    if (!showVersionNav || busy) return
    onPreviewIndexChange(previewIndex === versions.length - 1 ? 0 : previewIndex + 1)
  }, [busy, onPreviewIndexChange, previewIndex, showVersionNav, versions.length])

  const handlePreviewKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
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

  const handleLightboxKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
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

  function openLightbox() {
    if (!canExpand) return
    setLightboxOpen(true)
  }

  return (
    <Field className="gap-1.5">
      <div
        className="mx-auto flex w-full max-w-[280px] items-center gap-1"
        onKeyDown={handlePreviewKeyDown}
        role="group"
        tabIndex={showVersionNav ? 0 : undefined}
      >
        {showVersionNav ? (
          <Button
            aria-label={t('generate.previousVersion')}
            className="shrink-0"
            disabled={busy}
            onClick={goPrev}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ChevronLeftIcon />
          </Button>
        ) : null}
        <div className="relative min-w-0 flex-1">
          <div
            className={cn(
              'relative overflow-hidden border border-border/60',
              previewAspectClass(kind),
              previewUrl ? 'bg-muted/30' : 'border-transparent',
            )}
          >
            {previewUrl ? (
              <button
                aria-label={t('generate.expandPreview')}
                className={cn(
                  'size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isGenerating && 'pointer-events-none',
                )}
                disabled={!canExpand}
                onClick={openLightbox}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
                <img alt="" className="size-full object-cover" src={previewUrl} />
              </button>
            ) : (
              <InstagramItemDefaultImage
                className="gap-2 p-4 text-center [&_svg:not([class*='size-'])]:size-10"
                kind={kind}
                label={t('generate.previewEmptyTitle')}
              />
            )}
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                <Spinner className="size-6" />
              </div>
            ) : null}
          </div>
          {canExpand ? (
            <div className="absolute top-1.5 left-1.5">
              <Button
                aria-label={t('generate.expandPreview')}
                className="shadow-sm"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation()
                  openLightbox()
                }}
                size="icon-xs"
                type="button"
                variant="secondary"
              >
                <Maximize2Icon />
              </Button>
            </div>
          ) : null}
          {canDeleteVersion ? (
            <div className="absolute top-1.5 right-1.5">
              <Button
                aria-label={t('generate.deleteVersion')}
                className="shadow-sm"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation()
                  onRequestDelete()
                }}
                size="icon-xs"
                type="button"
                variant="secondary"
              >
                <Trash2Icon />
              </Button>
            </div>
          ) : null}
          {canCommit ? (
            <div className="absolute inset-x-0 bottom-0 flex justify-center p-2">
              <Button
                className="h-7 px-2 text-xs shadow-sm"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation()
                  onCommit()
                }}
                size="sm"
                type="button"
              >
                {isCommitting ? <Spinner data-icon="inline-start" /> : null}
                {isCommitting ? t('generate.committing') : t('generate.useAsItemImage')}
              </Button>
            </div>
          ) : null}
        </div>
        {showVersionNav ? (
          <Button
            aria-label={t('generate.nextVersion')}
            className="shrink-0"
            disabled={busy}
            onClick={goNext}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ChevronRightIcon />
          </Button>
        ) : null}
      </div>
      {showVersionNav ? (
        <div className="flex flex-col items-center gap-1.5">
          <p aria-live="polite" className="text-center text-muted-foreground text-xs">
            {t('generate.versionIndicator', {
              current: previewIndex + 1,
              total: versions.length,
            })}
          </p>
          <div className="flex items-center justify-center gap-1.5" role="tablist">
            {versions.map((version, index) => {
              const selected = index === previewIndex
              return (
                <button
                  aria-label={t('generate.versionDotAria', {
                    index: index + 1,
                    total: versions.length,
                  })}
                  aria-selected={selected}
                  className={cn(
                    'size-1.5 rounded-full transition-colors',
                    selected
                      ? 'bg-foreground'
                      : 'bg-muted-foreground/40 hover:bg-muted-foreground/70',
                  )}
                  disabled={busy}
                  key={version.id}
                  onClick={() => onPreviewIndexChange(index)}
                  role="tab"
                  type="button"
                />
              )
            })}
          </div>
        </div>
      ) : null}
      <FieldDescription>
        {kind === 'post' ? t('generate.formatHintPost') : t('generate.formatHintStory')}
      </FieldDescription>

      <Dialog
        onOpenChange={(open) => {
          setLightboxOpen(open)
        }}
        open={lightboxOpen && Boolean(previewUrl)}
      >
        {previewUrl ? (
          <DialogContent
            className="max-w-[min(96vw,72rem)] border-none bg-transparent p-0 shadow-none sm:max-w-[min(96vw,72rem)]"
            onKeyDown={handleLightboxKeyDown}
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">
              {showVersionNav
                ? t('generate.versionIndicator', {
                    current: previewIndex + 1,
                    total: versions.length,
                  })
                : t('generate.previewLabel')}
            </DialogTitle>
            <div className="flex flex-col items-center gap-3">
              <div className="group relative flex min-h-[12rem] w-full items-center justify-center">
                <DialogClose
                  aria-label={t('generate.closePreview')}
                  className="absolute top-3 right-3 z-30 flex size-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-offset-background transition-opacity hover:bg-black/85 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
                  type="button"
                >
                  <XIcon aria-hidden />
                </DialogClose>
                {!lightboxImageLoaded ? (
                  <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <Spinner className="size-10 text-muted-foreground" />
                  </div>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
                <img
                  alt=""
                  className={cn(
                    'relative z-10 max-h-[calc(100dvh-5.5rem)] w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300 sm:max-h-[calc(90vh-5.5rem)]',
                    lightboxImageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setLightboxImageLoaded(true)}
                  src={previewUrl}
                />
                {showVersionNav ? (
                  <>
                    <button
                      aria-label={t('generate.previousVersion')}
                      className="absolute inset-y-0 left-0 z-20 flex w-[18%] min-w-12 max-w-24 items-center justify-start bg-transparent pl-2 text-white outline-none transition-opacity focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      disabled={busy}
                      onClick={goPrev}
                      type="button"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-black/55 shadow-md backdrop-blur-sm">
                        <ChevronLeftIcon aria-hidden />
                      </span>
                    </button>
                    <button
                      aria-label={t('generate.nextVersion')}
                      className="absolute inset-y-0 right-0 z-20 flex w-[18%] min-w-12 max-w-24 items-center justify-end bg-transparent pr-2 text-white outline-none transition-opacity focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      disabled={busy}
                      onClick={goNext}
                      type="button"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-black/55 shadow-md backdrop-blur-sm">
                        <ChevronRightIcon aria-hidden />
                      </span>
                    </button>
                  </>
                ) : null}
              </div>
              {showVersionNav ? (
                <div className="flex flex-col items-center gap-2">
                  <p aria-live="polite" className="text-center text-sm text-white drop-shadow-sm">
                    {t('generate.versionIndicator', {
                      current: previewIndex + 1,
                      total: versions.length,
                    })}
                  </p>
                  <div className="flex items-center justify-center gap-2" role="tablist">
                    {versions.map((version, index) => {
                      const selected = index === previewIndex
                      return (
                        <button
                          aria-label={t('generate.versionDotAria', {
                            index: index + 1,
                            total: versions.length,
                          })}
                          aria-selected={selected}
                          className={cn(
                            'size-2 rounded-full transition-colors',
                            selected ? 'bg-white' : 'bg-white/40 hover:bg-white/70',
                          )}
                          disabled={busy}
                          key={version.id}
                          onClick={() => onPreviewIndexChange(index)}
                          role="tab"
                          type="button"
                        />
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </Field>
  )
}
