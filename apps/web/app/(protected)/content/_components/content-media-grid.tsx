'use client'

import { useRef, useState } from 'react'
import { useFormatter } from 'next-intl'
import { Check, Download, Loader2, Maximize2, Play, Trash2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import { formatBytes, formatDimensions, MEDIA_GRID_SKELETON_COUNT } from '@/lib/format-media'

import {
  aspectRatioForDimensions,
  CONTENT_MEDIA_GRID_CLASS,
  contentMediaType,
  contentOverlayIconButtonBase,
  contentTileOverlayReveal,
  DEFAULT_CONTENT_ASPECT_RATIO,
  type ContentCatalogItem,
} from './content-catalog-types'
import {
  ContentMediaGridProvider,
  useContentMediaGridActions,
  useContentMediaGridState,
  useContentMediaTileMode,
  type ContentMediaGridLabels,
} from './content-media-grid-context'

export type { ContentMediaGridLabels }

function ContentMediaGridRoot({ children }: { children: ReactNode }) {
  return <section className="w-full">{children}</section>
}

function ContentMediaGridLoading() {
  const { skeletonCount } = useContentMediaGridState()

  return (
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
  )
}

function ContentMediaGridEmpty() {
  const { labels, emptyIcon: EmptyIcon } = useContentMediaGridState()

  return (
    <Card className="border-dashed bg-muted/20 py-16 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <EmptyIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{labels.emptyTitle}</h3>
        <p className="text-sm text-muted-foreground">{labels.emptyDescription}</p>
      </div>
    </Card>
  )
}

function ContentMediaGridList({ children }: { children: ReactNode }) {
  return <div className={CONTENT_MEDIA_GRID_CLASS}>{children}</div>
}

function ContentMediaTileVideoPreview({ item }: { item: ContentCatalogItem }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHoverPlaying, setIsHoverPlaying] = useState(false)
  const { onVideoMetadata } = useContentMediaGridActions()

  const handleMouseEnter = () => {
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => {})
  }

  const handleMouseLeave = () => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
    setIsHoverPlaying(false)
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <video
        ref={videoRef}
        src={item.url}
        preload="metadata"
        muted
        loop
        playsInline
        className="size-full object-contain transition duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:scale-[1.02]"
        onLoadedMetadata={(e) => {
          onVideoMetadata(item.name, e.currentTarget.videoWidth, e.currentTarget.videoHeight)
        }}
        onPlay={() => setIsHoverPlaying(true)}
        onPause={() => setIsHoverPlaying(false)}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          isHoverPlaying ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
          <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function ContentMediaTileVideoStatic({ item }: { item: ContentCatalogItem }) {
  const { onVideoMetadata } = useContentMediaGridActions()

  return (
    <>
      <video
        src={item.url}
        preload="metadata"
        muted
        playsInline
        className="size-full object-contain transition duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:scale-[1.02]"
        onLoadedMetadata={(e) => {
          onVideoMetadata(item.name, e.currentTarget.videoWidth, e.currentTarget.videoHeight)
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
          <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
        </div>
      </div>
    </>
  )
}

function ContentMediaTileMedia({ item }: { item: ContentCatalogItem }) {
  const { imageDimensionsByName, defaultAspectRatio } = useContentMediaGridState()
  const { onImageNaturalSize } = useContentMediaGridActions()
  const tileMode = useContentMediaTileMode()

  const mediaType = contentMediaType(item)
  const isVideo = mediaType === 'video'
  const dimensions = imageDimensionsByName[item.name]
  const aspectRatio = aspectRatioForDimensions(dimensions, defaultAspectRatio)

  return (
    <div className="relative w-full overflow-hidden bg-muted/30 text-left" style={{ aspectRatio }}>
      {isVideo ? (
        tileMode === 'videoHoverPreview' ? (
          <ContentMediaTileVideoPreview item={item} />
        ) : (
          <ContentMediaTileVideoStatic item={item} />
        )
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */
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
      )}
    </div>
  )
}

function ContentMediaTileActions({
  item,
  onOpenPreview,
}: {
  item: ContentCatalogItem
  onOpenPreview: () => void
}) {
  const { labels, deleting } = useContentMediaGridState()
  const { getDownloadHref, onDeleteRequest } = useContentMediaGridActions()
  const isVideo = contentMediaType(item) === 'video'
  const previewLabel = isVideo ? labels.previewVideo : labels.previewImage

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={`${contentOverlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
        aria-label={previewLabel}
        onClick={(e) => {
          e.stopPropagation()
          onOpenPreview()
        }}
      >
        {isVideo ? (
          <Play className="h-5 w-5 sm:h-4 sm:w-4" />
        ) : (
          <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />
        )}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={`${contentOverlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
        aria-label={labels.download}
        asChild
      >
        <a
          href={getDownloadHref(item.name)}
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
        className={`${contentOverlayIconButtonBase} bg-white/95 text-destructive hover:bg-white`}
        disabled={deleting === item.name}
        aria-label={labels.delete}
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
    </>
  )
}

function ContentMediaTileMeta({ item }: { item: ContentCatalogItem }) {
  const format = useFormatter()
  const { imageDimensionsByName } = useContentMediaGridState()
  const dims = imageDimensionsByName[item.name]
  const dimensions = formatDimensions(dims?.width, dims?.height)
  const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`

  return (
    <div className="flex items-center justify-between border-t border-border/50 px-2 py-1.5 text-[10px] text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
      <span className="truncate">{sizeWithDimensions}</span>
      <time dateTime={item.createdAt}>
        {format.dateTime(new Date(item.createdAt), {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </time>
    </div>
  )
}

function ContentMediaTile({ item }: { item: ContentCatalogItem }) {
  const { labels, selectedName } = useContentMediaGridState()
  const { onPreview, onSelect } = useContentMediaGridActions()
  const isVideo = contentMediaType(item) === 'video'
  const previewLabel = isVideo ? labels.previewVideo : labels.previewImage
  const selectionEnabled = onSelect != null
  const isSelected = selectionEnabled && selectedName === item.name
  const selectLabel = labels.select ?? 'Select'

  const openPreview = () => {
    onPreview(item)
  }

  const toggleSelect = () => {
    onSelect?.(item)
  }

  const handleMediaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (selectionEnabled) toggleSelect()
      else openPreview()
    }
  }

  return (
    <figure
      className={cn(
        'group/tile w-full max-w-[11rem] min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-[box-shadow,border-color,opacity] [content-visibility:auto] [contain-intrinsic-size:0_11rem]',
        isSelected
          ? 'border-primary ring-2 ring-primary/40 shadow-md'
          : 'border-border/60 hover:shadow-md',
        selectionEnabled && selectedName && !isSelected ? 'opacity-70' : 'opacity-100',
      )}
      data-selected={isSelected ? 'true' : undefined}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={selectionEnabled ? selectLabel : previewLabel}
        aria-pressed={selectionEnabled ? isSelected : undefined}
        className="relative w-full cursor-pointer overflow-hidden outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={selectionEnabled ? toggleSelect : openPreview}
        onKeyDown={handleMediaKeyDown}
      >
        <ContentMediaTileMedia item={item} />
        {selectionEnabled ? (
          <div
            className={cn(
              'absolute top-2 left-2 z-20 flex size-7 items-center justify-center rounded-full border shadow-sm transition-colors',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/80 bg-black/45 text-white',
            )}
            aria-hidden
          >
            {isSelected ? <Check className="size-4" strokeWidth={3} /> : null}
          </div>
        ) : null}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent ${contentTileOverlayReveal}`}
        />
        <div
          className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${contentTileOverlayReveal}`}
        >
          <figcaption className="min-w-0 flex-1 truncate text-left text-[10px] font-medium text-white drop-shadow sm:text-xs">
            {item.name}
          </figcaption>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-1">
            <ContentMediaTileActions item={item} onOpenPreview={openPreview} />
          </div>
        </div>
      </div>
      <ContentMediaTileMeta item={item} />
    </figure>
  )
}

function ContentMediaGridView() {
  const { loading, items } = useContentMediaGridState()

  if (loading) {
    return (
      <ContentMediaGridRoot>
        <ContentMediaGridLoading />
      </ContentMediaGridRoot>
    )
  }

  if (items.length === 0) {
    return (
      <ContentMediaGridRoot>
        <ContentMediaGridEmpty />
      </ContentMediaGridRoot>
    )
  }

  return (
    <ContentMediaGridRoot>
      <ContentMediaGridList>
        {items.map((item) => (
          <ContentMediaTile key={item.name} item={item} />
        ))}
      </ContentMediaGridList>
    </ContentMediaGridRoot>
  )
}

export const ContentMediaGridParts = {
  Provider: ContentMediaGridProvider,
  Root: ContentMediaGridRoot,
  Loading: ContentMediaGridLoading,
  Empty: ContentMediaGridEmpty,
  List: ContentMediaGridList,
  Tile: ContentMediaTile,
  TileMedia: ContentMediaTileMedia,
  TileMeta: ContentMediaTileMeta,
  TileActions: ContentMediaTileActions,
  View: ContentMediaGridView,
}

export { ContentMediaGridProvider } from './content-media-grid-context'

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
  tileMode?: 'static' | 'videoHoverPreview'
  /** When set with `onSelect`, tiles show selection chrome; click selects, expand still previews. */
  selectedName?: string | null
  onSelect?: (item: ContentCatalogItem) => void
}

/** Flat API wrapper; prefer `ContentMediaGridParts` for explicit composition. */
export function ContentMediaGrid({
  skeletonCount = MEDIA_GRID_SKELETON_COUNT,
  defaultAspectRatio = DEFAULT_CONTENT_ASPECT_RATIO,
  tileMode = 'static',
  selectedName = null,
  onSelect,
  ...props
}: ContentMediaGridProps) {
  return (
    <ContentMediaGridParts.Provider
      actions={{
        getDownloadHref: props.getDownloadHref,
        onDeleteRequest: props.onDeleteRequest,
        onImageNaturalSize: props.onImageNaturalSize,
        onPreview: props.onPreview,
        onVideoMetadata: props.onVideoMetadata,
        onSelect: onSelect ?? null,
      }}
      state={{
        defaultAspectRatio,
        deleting: props.deleting,
        emptyIcon: props.emptyIcon,
        imageDimensionsByName: props.imageDimensionsByName,
        items: props.items,
        labels: props.labels,
        loading: props.loading,
        skeletonCount,
        selectedName,
      }}
      tileMode={tileMode}
    >
      <ContentMediaGridParts.View />
    </ContentMediaGridParts.Provider>
  )
}
