'use client'

import { useFormatter } from 'next-intl'
import type { LucideIcon } from 'lucide-react'

import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

import {
  ASSETS_GRID_SKELETON_COUNT,
  formatBytes,
  formatDimensions,
} from '@/app/(protected)/canvas/_components/asset-item-types'

import {
  CONTENT_MEDIA_GRID_CLASS,
  DEFAULT_CONTENT_ASPECT_RATIO,
  type ContentCatalogItem,
  contentMediaType,
} from './content-catalog-types'
import { ContentMediaTile } from './content-media-tile'

export type ContentMediaGridLabels = {
  previewImage: string
  previewVideo: string
  delete: string
  download: string
  emptyTitle: string
  emptyDescription: string
}

export type ContentMediaGridProps = {
  loading: boolean
  items: ContentCatalogItem[]
  imageDimensionsByName: Record<string, { width: number; height: number }>
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onVideoMetadata: (name: string, width: number, height: number) => void
  deleting: string | null
  onPreview: (item: ContentCatalogItem) => void
  onDeleteRequest: (name: string) => void
  getDownloadHref: (name: string) => string
  labels: ContentMediaGridLabels
  emptyIcon: LucideIcon
  skeletonCount?: number
  defaultAspectRatio?: string
  videoHoverPreview?: boolean
}

export function ContentMediaGrid({
  loading,
  items,
  imageDimensionsByName,
  onImageNaturalSize,
  onVideoMetadata,
  deleting,
  onPreview,
  onDeleteRequest,
  getDownloadHref,
  labels,
  emptyIcon: EmptyIcon,
  skeletonCount = ASSETS_GRID_SKELETON_COUNT,
  defaultAspectRatio = DEFAULT_CONTENT_ASPECT_RATIO,
  videoHoverPreview,
}: ContentMediaGridProps) {
  const format = useFormatter()

  return (
    <section className="w-full">
      {loading ? (
        <div className={CONTENT_MEDIA_GRID_CLASS}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="w-full max-w-[11rem] min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
            >
              <Skeleton className="aspect-[9/16] w-full" />
              <div className="flex flex-col gap-2 p-2 sm:p-3">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed bg-muted/20 py-16 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <EmptyIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{labels.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">{labels.emptyDescription}</p>
          </div>
        </Card>
      ) : (
        <div className={CONTENT_MEDIA_GRID_CLASS}>
          {items.map((item) => {
            const dims = imageDimensionsByName[item.name]
            const dimensions = formatDimensions(dims?.width, dims?.height)
            const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`
            const previewLabel =
              contentMediaType(item) === 'video' ? labels.previewVideo : labels.previewImage

            return (
              <ContentMediaTile
                key={item.name}
                item={item}
                dimensions={dims}
                sizeWithDimensions={sizeWithDimensions}
                createdAtLabel={format.dateTime(new Date(item.createdAt), {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                previewLabel={previewLabel}
                deleteLabel={labels.delete}
                downloadLabel={labels.download}
                downloadHref={getDownloadHref(item.name)}
                deleting={deleting}
                onImageNaturalSize={onImageNaturalSize}
                onVideoMetadata={onVideoMetadata}
                onPreview={onPreview}
                onDeleteRequest={onDeleteRequest}
                defaultAspectRatio={defaultAspectRatio}
                videoHoverPreview={videoHoverPreview}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
