'use client'

import { ImageIcon, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { POST_IMAGE_ASPECT_RATIO } from './post-creator-constants'

export type PostCreatorReferenceImage = {
  name: string
  url: string
}

export type PostCreatorImageVersion = {
  id: string
  mediaS3Key: string
  imageUrl: string
  createdAt: string
}

export type PostCreatorPage = {
  id: string
  sortOrder: number
  prompt: string | null
  imageUrl: string | null
  mediaS3Key?: string | null
  imageVersions?: PostCreatorImageVersion[]
  previewVersionIndex?: number
  referenceImages?: PostCreatorReferenceImage[]
}

export type PostCreatorThumbnailsPaneProps = {
  pages: PostCreatorPage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onAddPage?: () => void
  onDuplicatePage?: () => void
  canAddPage?: boolean
  canDuplicatePage?: boolean
  isAddingPage?: boolean
  isDuplicatingPage?: boolean
  isLoading?: boolean
}

export function PostCreatorThumbnailsPane({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  canAddPage = false,
  canDuplicatePage = false,
  isAddingPage = false,
  isDuplicatingPage = false,
  isLoading = false,
}: PostCreatorThumbnailsPaneProps) {
  const t = useTranslations('postCreator.thumbnails')

  if (isLoading) {
    return (
      <section
        aria-label={t('ariaLabel')}
        className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 py-4"
      >
        <div
          className="w-full animate-pulse rounded-md border border-border/60 bg-muted/40"
          style={{ aspectRatio: POST_IMAGE_ASPECT_RATIO }}
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

        return (
          <button
            key={page.id}
            type="button"
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => onSelectPage(page.id)}
            className={cn(
              'relative w-full shrink-0 overflow-hidden rounded-md border bg-muted/20 transition-colors',
              isSelected
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border/60 hover:border-border',
            )}
            style={{ aspectRatio: POST_IMAGE_ASPECT_RATIO }}
          >
            {page.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
              <img src={page.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-1 bg-muted/30 p-1 text-muted-foreground">
                <ImageIcon aria-hidden className="h-4 w-4" />
                <span className="text-[10px] font-medium leading-none">{page.sortOrder + 1}</span>
              </div>
            )}
          </button>
        )
      })}
      {onAddPage ? (
        <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
          <button
            type="button"
            aria-label={isAddingPage ? t('addingPage') : t('addPage')}
            disabled={!canAddPage || isAddingPage || isDuplicatingPage || isLoading}
            onClick={onAddPage}
            className={cn(
              'flex size-10 items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/20 text-muted-foreground transition-colors',
              'hover:border-border hover:bg-muted/40 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            {isAddingPage ? <Spinner /> : <Plus aria-hidden className="size-5" />}
          </button>
          {onDuplicatePage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              disabled={!canDuplicatePage || isAddingPage || isDuplicatingPage || isLoading}
              onClick={onDuplicatePage}
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
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
