'use client'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { cn } from '@workspace/ui/lib/utils'
import { X } from 'lucide-react'

import type { PostCreatorReferenceImage } from './post-creator-thumbnails-pane'

const REFERENCE_THUMB_SIZE = 56

export type PostCreatorReferenceThumbnailsProps = {
  images: PostCreatorReferenceImage[]
  onRemove: (name: string) => void
  onToggleEnabled: (name: string, enabled: boolean) => void
  ariaLabel: string
  removeLabel: string
  includeLabel: string
  indexLabel: (index: number) => string
  disabled?: boolean
}

export function PostCreatorReferenceThumbnails({
  images,
  onRemove,
  onToggleEnabled,
  ariaLabel,
  removeLabel,
  includeLabel,
  indexLabel,
  disabled = false,
}: PostCreatorReferenceThumbnailsProps) {
  if (images.length === 0) return null

  let enabledIndex = 0

  return (
    <div aria-label={ariaLabel} className="flex flex-wrap gap-2" role="list">
      {images.map((image) => {
        const badgeIndex = image.enabled ? ++enabledIndex : null

        return (
          <div
            key={image.name}
            className={cn(
              'group relative size-14 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/20',
              !image.enabled && 'opacity-50',
            )}
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
            {badgeIndex !== null ? (
              <span className="absolute bottom-0.5 left-0.5 rounded bg-background/90 px-1 py-0.5 text-[10px] font-medium leading-none text-foreground">
                {indexLabel(badgeIndex)}
              </span>
            ) : null}
            <div className="absolute left-0.5 top-0.5">
              <Checkbox
                checked={image.enabled}
                disabled={disabled}
                aria-label={includeLabel}
                className="size-4 border-background/80 bg-background/90 data-[state=checked]:bg-primary"
                onCheckedChange={(checked) => onToggleEnabled(image.name, checked === true)}
              />
            </div>
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
        )
      })}
    </div>
  )
}
