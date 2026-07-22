'use client'

import { useCallback, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

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

  const showVersionNav = versions.length > 1
  const previewVersion = versions[previewIndex] ?? versions[0]
  const previewUrl = previewVersion?.imageUrl ?? null
  const canCommit =
    Boolean(previewVersion?.mediaS3Key) && showVersionNav && previewIndex !== committedIndex

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

  return (
    <Field className="gap-1.5">
      <FieldLabel>{t('generate.previewLabel')}</FieldLabel>
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
              'relative overflow-hidden rounded-lg border border-border/60 bg-muted/30',
              previewAspectClass(kind),
              !previewUrl && 'border-dashed',
            )}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
              <img alt="" className="size-full object-cover" src={previewUrl} />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
                  <ImageIcon aria-hidden />
                </span>
                <span className="font-medium text-foreground text-xs">
                  {t('generate.previewEmptyTitle')}
                </span>
                <span className="text-muted-foreground text-xs">{t('generate.previewEmpty')}</span>
              </div>
            )}
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                <Spinner className="size-6" />
              </div>
            ) : null}
          </div>
          {canDeleteVersion ? (
            <div className="absolute top-1.5 right-1.5">
              <Button
                aria-label={t('generate.deleteVersion')}
                className="shadow-sm"
                disabled={busy}
                onClick={onRequestDelete}
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
                onClick={onCommit}
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
    </Field>
  )
}
