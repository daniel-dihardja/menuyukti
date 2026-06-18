'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Download, Film, Loader2, Maximize2, Play, Trash2 } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

import {
  ASSETS_GRID_SKELETON_COUNT,
  formatBytes,
  formatDimensions,
} from '@/app/(protected)/canvas/_components/asset-item-types'
import type { ReelCatalogItem } from '@/lib/reels/client-api'
import { reelDownloadHref } from '@/lib/reels/client-api'

const tileOverlayReveal =
  'opacity-100 transition-opacity duration-300 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100'

const overlayIconButtonBase =
  'h-11 w-11 shrink-0 touch-manipulation rounded-full shadow-md transition-transform duration-150 active:scale-[0.97] sm:h-9 sm:w-9 sm:active:scale-100'

export type ReelsMediaGridProps = {
  loading: boolean
  items: ReelCatalogItem[]
  imageDimensionsByName: Record<string, { width: number; height: number }>
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onVideoMetadata: (name: string, width: number, height: number) => void
  deleting: string | null
  onPreview: (item: ReelCatalogItem) => void
  onDeleteRequest: (name: string) => void
  skeletonCount?: number
}

export function ReelsMediaGrid({
  loading,
  items,
  imageDimensionsByName,
  onImageNaturalSize,
  onVideoMetadata,
  deleting,
  onPreview,
  onDeleteRequest,
  skeletonCount = ASSETS_GRID_SKELETON_COUNT,
}: ReelsMediaGridProps) {
  const t = useTranslations('reels')
  const format = useFormatter()

  return (
    <section className="w-full">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
            >
              <Skeleton className="aspect-[4/3]" />
              <div className="flex flex-col gap-2 p-3">
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
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t('grid.empty.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('grid.empty.description')}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {items.map((item) => {
            const dimensions = formatDimensions(
              imageDimensionsByName[item.name]?.width,
              imageDimensionsByName[item.name]?.height,
            )
            const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`
            const previewLabel = item.mediaType === 'video' ? t('grid.play') : t('grid.viewLarge')

            return (
              <figure
                key={item.name}
                className="group/tile min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30 text-left">
                  {item.mediaType === 'video' ? (
                    <>
                      <video
                        src={item.url}
                        preload="metadata"
                        muted
                        playsInline
                        className="size-full object-cover transition duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:scale-[1.02]"
                        onLoadedMetadata={(e) => {
                          onVideoMetadata(
                            item.name,
                            e.currentTarget.videoWidth,
                            e.currentTarget.videoHeight,
                          )
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
                          <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */
                    <img
                      src={item.url}
                      alt=""
                      width={400}
                      height={300}
                      loading="lazy"
                      className="size-full object-cover transition duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:scale-[1.02]"
                      onLoad={(e) => {
                        onImageNaturalSize(
                          item.name,
                          e.currentTarget.naturalWidth,
                          e.currentTarget.naturalHeight,
                        )
                      }}
                    />
                  )}
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent ${tileOverlayReveal}`}
                  />
                  <div
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${tileOverlayReveal}`}
                  >
                    <figcaption className="min-w-0 flex-1 truncate text-left text-xs font-medium text-white drop-shadow">
                      {item.name}
                    </figcaption>
                    <div className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className={`${overlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
                        aria-label={previewLabel}
                        onClick={() => onPreview(item)}
                      >
                        {item.mediaType === 'video' ? (
                          <Play className="h-5 w-5 sm:h-4 sm:w-4" />
                        ) : (
                          <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className={`${overlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
                        aria-label={t('grid.download')}
                        asChild
                      >
                        <a
                          href={reelDownloadHref(item.name)}
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
                        aria-label={t('grid.delete')}
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
                <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="truncate">{sizeWithDimensions}</span>
                  <time dateTime={item.createdAt}>
                    {format.dateTime(new Date(item.createdAt), {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}
