'use client'

import { Button } from '@workspace/ui/components/button'
import { X } from 'lucide-react'

import type { PostCreatorReferenceImage } from './post-creator-thumbnails-pane'

const REFERENCE_THUMB_SIZE = 56

export type PostCreatorReferenceThumbnailsProps = {
  images: PostCreatorReferenceImage[]
  onRemove: (name: string) => void
  ariaLabel: string
  removeLabel: string
  disabled?: boolean
}

export function PostCreatorReferenceThumbnails({
  images,
  onRemove,
  ariaLabel,
  removeLabel,
  disabled = false,
}: PostCreatorReferenceThumbnailsProps) {
  if (images.length === 0) return null

  return (
    <div aria-label={ariaLabel} className="flex flex-wrap gap-2" role="list">
      {images.map((image) => (
        <div
          key={image.name}
          className="group relative size-14 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/20"
          role="listitem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
          <img
            src={image.url}
            alt=""
            width={REFERENCE_THUMB_SIZE}
            height={REFERENCE_THUMB_SIZE}
            className="size-full object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-0.5 top-0.5 size-5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            disabled={disabled}
            aria-label={removeLabel}
            onClick={() => onRemove(image.name)}
          >
            <X className="size-3" aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  )
}
