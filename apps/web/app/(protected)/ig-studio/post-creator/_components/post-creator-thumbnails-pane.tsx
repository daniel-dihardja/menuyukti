'use client'

import { ImageIcon, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { usePostCreator } from '../_context/use-post-creator'
import {
  DEFAULT_POST_IMAGE_FORMAT,
  formatAspectCss,
  resolveLeonardoOutputDimensions,
} from '@/lib/posts/leonardo-post-dimensions'
import { DEFAULT_LEONARDO_POST_MODEL } from '@/lib/posts/leonardo-post-models'

export type {
  PostCreatorImageVersion,
  PostCreatorPage,
  PostCreatorReferenceImage,
} from '@/lib/posts/post-creator-types'

export function PostCreatorThumbnailsPane() {
  const t = useTranslations('postCreator.thumbnails')
  const { state, actions, meta } = usePostCreator()
  const {
    pages,
    selectedPageId,
    isAddingPage,
    isDuplicatingPage,
    isLoadingPost: isLoading,
    imageFormat,
    imageQuality,
    generationModel,
  } = state
  const { selectPage, addPage, duplicatePage } = actions
  const { canPersistPages, canAddPage, canDuplicatePage } = meta

  const selectedAspect = formatAspectCss(imageFormat)

  if (isLoading) {
    return (
      <section
        aria-label={t('ariaLabel')}
        className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 py-4"
      >
        <div
          className="w-full animate-pulse rounded-md border border-border/60 bg-muted/40"
          style={{ aspectRatio: selectedAspect }}
        />
      </section>
    )
  }

  if (pages.length === 0) {
    return (
      <section
        aria-label={t('ariaLabel')}
        className="flex h-full min-h-0 items-center justify-center px-3 py-4"
      >
        <p className="text-center text-xs text-muted-foreground">{t('empty')}</p>
      </section>
    )
  }

  return (
    <section
      aria-label={t('ariaLabel')}
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 py-4"
    >
      {pages.map((page) => {
        const isSelected = page.id === selectedPageId
        const label = t('pageLabel', { number: page.sortOrder + 1 })
        const pageFormat =
          page.imageFormat ?? (isSelected ? imageFormat : DEFAULT_POST_IMAGE_FORMAT)
        const pageQuality = page.imageQuality ?? (isSelected ? imageQuality : 'standard')
        const pageModel =
          page.generationModel ?? (isSelected ? generationModel : DEFAULT_LEONARDO_POST_MODEL)
        const pageAspect = formatAspectCss(pageFormat)
        const pageDims = resolveLeonardoOutputDimensions({
          model: pageModel,
          format: pageFormat,
          quality: pageQuality,
        })

        return (
          <button
            key={page.id}
            type="button"
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => selectPage(page.id)}
            className={cn(
              'relative w-full shrink-0 overflow-hidden rounded-md border bg-muted/20 transition-colors',
              isSelected
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border/60 hover:border-border',
            )}
            style={{ aspectRatio: pageAspect }}
          >
            {page.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
              <img
                src={page.imageUrl}
                alt=""
                width={pageDims.width}
                height={pageDims.height}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-1 bg-muted/30 p-1 text-muted-foreground">
                <ImageIcon aria-hidden className="h-4 w-4" />
                <span className="text-xs font-medium leading-none">{page.sortOrder + 1}</span>
              </div>
            )}
          </button>
        )
      })}
      {canPersistPages ? (
        <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
          <button
            type="button"
            aria-label={isAddingPage ? t('addingPage') : t('addPage')}
            disabled={!canAddPage || isAddingPage || isDuplicatingPage || isLoading}
            onClick={() => void addPage()}
            className={cn(
              'flex size-10 items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/20 text-muted-foreground transition-colors',
              'hover:border-border hover:bg-muted/40 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            {isAddingPage ? <Spinner /> : <Plus aria-hidden className="size-5" />}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            disabled={!canDuplicatePage || isAddingPage || isDuplicatingPage || isLoading}
            onClick={() => void duplicatePage()}
          >
            {isDuplicatingPage ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner />
                {t('duplicatingPage')}
              </span>
            ) : (
              t('duplicatePage')
            )}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
