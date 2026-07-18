'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { cn } from '@workspace/ui/lib/utils'

import type { PostCreatorImageVersion } from '@/lib/posts/post-creator-types'

export type PostCreatorVersionFilmstripProps = {
  versions: PostCreatorImageVersion[]
  previewIndex: number
  postImageIndex: number
  aspectRatio: string
  outputWidth: number
  outputHeight: number
  onPreviewIndex: (index: number) => void
  isCommitting?: boolean
}

export function PostCreatorVersionFilmstrip({
  versions,
  previewIndex,
  postImageIndex,
  aspectRatio,
  outputWidth,
  outputHeight,
  onPreviewIndex,
  isCommitting = false,
}: PostCreatorVersionFilmstripProps) {
  const t = useTranslations('postCreator.preview')
  const previewThumbRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    previewThumbRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [previewIndex])

  if (versions.length <= 1) {
    return null
  }

  return (
    <div
      role="listbox"
      aria-label={t('versionsAriaLabel')}
      aria-busy={isCommitting}
      className="flex w-full gap-2 overflow-x-auto px-1 pb-1"
    >
      {versions.map((version, index) => {
        const isPreview = index === previewIndex
        const isPostImage = index === postImageIndex

        return (
          <button
            key={version.id}
            ref={isPreview ? previewThumbRef : undefined}
            type="button"
            role="option"
            aria-selected={isPreview}
            aria-current={isPreview ? 'true' : undefined}
            aria-label={
              isPostImage && isPreview
                ? t('versionOptionPostImagePreviewLabel', {
                    current: index + 1,
                    total: versions.length,
                  })
                : isPostImage
                  ? t('versionOptionPostImageLabel', {
                      current: index + 1,
                      total: versions.length,
                    })
                  : isPreview
                    ? t('versionOptionPreviewLabel', {
                        current: index + 1,
                        total: versions.length,
                      })
                    : t('versionOptionLabel', {
                        current: index + 1,
                        total: versions.length,
                      })
            }
            disabled={isCommitting}
            onClick={() => onPreviewIndex(index)}
            className={cn(
              'relative w-16 shrink-0 overflow-hidden rounded-md border bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isPreview
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border/60 hover:border-border',
              isCommitting && 'opacity-70',
            )}
            style={{ aspectRatio }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
            <img
              src={version.imageUrl}
              alt=""
              width={outputWidth}
              height={outputHeight}
              className="size-full object-cover"
            />
            {isPostImage ? (
              <span className="absolute bottom-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Check className="size-2.5" aria-hidden />
              </span>
            ) : null}
            {isCommitting && isPreview ? (
              <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                <span className="sr-only">{t('committingPostImage')}</span>
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
