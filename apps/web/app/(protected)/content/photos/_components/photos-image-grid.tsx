'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Download, ImageIcon, Loader2, Maximize2, Trash2 } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

import type { AssetItem } from '@/app/(protected)/canvas/_components/asset-item-types'
import {
  ASSETS_GRID_SKELETON_COUNT,
  formatBytes,
  formatDimensions,
} from '@/app/(protected)/canvas/_components/asset-item-types'
import { photoDownloadHref } from '@/lib/photos/client-api'

const PHOTO_GRID_CLASS =
  'grid grid-cols-2 items-start justify-items-center gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

const photoTileOverlayReveal =
  'opacity-100 transition-opacity duration-300 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100'

const overlayIconButtonBase =
  'h-11 w-11 shrink-0 touch-manipulation rounded-full shadow-md transition-transform duration-150 active:scale-[0.97] sm:h-9 sm:w-9 sm:active:scale-100'

const DEFAULT_ASPECT_RATIO = '9 / 16'

function aspectRatioForDimensions(dims: { width: number; height: number } | undefined): string {
  if (dims && dims.width > 0 && dims.height > 0) {
    return `${dims.width} / ${dims.height}`
  }
  return DEFAULT_ASPECT_RATIO
}

export type PhotosImageGridProps = {
  loading: boolean
  items: AssetItem[]
  imageDimensionsByName: Record<string, { width: number; height: number }>
  onImageNaturalSize: (name: string, width: number, height: number) => void
  deleting: string | null
  onPreview: (item: AssetItem) => void
  onDeleteRequest: (name: string) => void
  skeletonCount?: number
}

type PhotoGridTileProps = {
  item: AssetItem
  dimensions: { width: number; height: number } | undefined
  sizeWithDimensions: string
  createdAtLabel: string
  previewLabel: string
  deleteLabel: string
  downloadLabel: string
  deleting: string | null
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onPreview: (item: AssetItem) => void
  onDeleteRequest: (name: string) => void
}

function PhotoGridTile({
  item,
  dimensions,
  sizeWithDimensions,
  createdAtLabel,
  previewLabel,
  deleteLabel,
  downloadLabel,
  deleting,
  onImageNaturalSize,
  onPreview,
  onDeleteRequest,
}: PhotoGridTileProps) {
  const aspectRatio = aspectRatioForDimensions(dimensions)

  const openPreview = () => {
    onPreview(item)
  }

  const handleMediaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPreview()
    }
  }

  return (
    <figure className="group/tile w-full max-w-[11rem] min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div
        role="button"
        tabIndex={0}
        aria-label={previewLabel}
        className="relative w-full cursor-pointer overflow-hidden bg-muted/30 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ aspectRatio }}
        onClick={openPreview}
        onKeyDown={handleMediaKeyDown}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */}
        <img
          src={item.url}
          alt=""
          width={400}
          height={711}
          loading="lazy"
          className="size-full object-contain transition duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:scale-[1.02]"
          onLoad={(e) => {
            onImageNaturalSize(
              item.name,
              e.currentTarget.naturalWidth,
              e.currentTarget.naturalHeight,
            )
          }}
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent ${photoTileOverlayReveal}`}
        />
        <div
          className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${photoTileOverlayReveal}`}
        >
          <figcaption className="min-w-0 flex-1 truncate text-left text-[10px] font-medium text-white drop-shadow sm:text-xs">
            {item.name}
          </figcaption>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-1">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={`${overlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
              aria-label={previewLabel}
              onClick={(e) => {
                e.stopPropagation()
                openPreview()
              }}
            >
              <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={`${overlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
              aria-label={downloadLabel}
              asChild
            >
              <a
                href={photoDownloadHref(item.name)}
                download={item.name}
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-5 w-5 sm:h-4 sm:w-4" />
              </a>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={`${overlayIconButtonBase} bg-white/95 text-destructive hover:bg-white`}
              disabled={deleting === item.name}
              aria-label={deleteLabel}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteRequest(item.name)
              }}
            >
              {deleting === item.name ? (
                <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
              ) : (
                <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/50 px-2 py-1.5 text-[10px] text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
        <span className="truncate">{sizeWithDimensions}</span>
        <time dateTime={item.createdAt}>{createdAtLabel}</time>
      </div>
    </figure>
  )
}

export function PhotosImageGrid({
  loading,
  items,
  imageDimensionsByName,
  onImageNaturalSize,
  deleting,
  onPreview,
  onDeleteRequest,
  skeletonCount = ASSETS_GRID_SKELETON_COUNT,
}: PhotosImageGridProps) {
  const t = useTranslations('photos')
  const format = useFormatter()

  return (
    <section className="w-full">
      {loading ? (
        <div className={PHOTO_GRID_CLASS}>
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
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t('grid.empty.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('grid.empty.description')}</p>
          </div>
        </Card>
      ) : (
        <div className={PHOTO_GRID_CLASS}>
          {items.map((item) => {
            const dims = imageDimensionsByName[item.name]
            const dimensions = formatDimensions(dims?.width, dims?.height)
            const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`

            return (
              <PhotoGridTile
                key={item.name}
                item={item}
                dimensions={dims}
                sizeWithDimensions={sizeWithDimensions}
                createdAtLabel={format.dateTime(new Date(item.createdAt), {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                previewLabel={t('grid.viewLarge')}
                deleteLabel={t('grid.delete')}
                downloadLabel={t('grid.download')}
                deleting={deleting}
                onImageNaturalSize={onImageNaturalSize}
                onPreview={onPreview}
                onDeleteRequest={onDeleteRequest}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
