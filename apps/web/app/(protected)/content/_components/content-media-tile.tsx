'use client'

import { useRef, useState } from 'react'
import { Download, Loader2, Maximize2, Play, Trash2 } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import {
  aspectRatioForDimensions,
  contentMediaType,
  contentOverlayIconButtonBase,
  contentTileOverlayReveal,
  type ContentCatalogItem,
} from './content-catalog-types'

export type ContentMediaTileProps = {
  item: ContentCatalogItem
  dimensions: { width: number; height: number } | undefined
  sizeWithDimensions: string
  createdAtLabel: string
  previewLabel: string
  deleteLabel: string
  downloadLabel: string
  downloadHref: string
  deleting: string | null
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onVideoMetadata: (name: string, width: number, height: number) => void
  onPreview: (item: ContentCatalogItem) => void
  onDeleteRequest: (name: string) => void
  defaultAspectRatio?: string
  videoHoverPreview?: boolean
}

export function ContentMediaTile({
  item,
  dimensions,
  sizeWithDimensions,
  createdAtLabel,
  previewLabel,
  deleteLabel,
  downloadLabel,
  downloadHref,
  deleting,
  onImageNaturalSize,
  onVideoMetadata,
  onPreview,
  onDeleteRequest,
  defaultAspectRatio,
  videoHoverPreview = true,
}: ContentMediaTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHoverPlaying, setIsHoverPlaying] = useState(false)

  const mediaType = contentMediaType(item)
  const isVideo = mediaType === 'video'
  const aspectRatio = aspectRatioForDimensions(dimensions, defaultAspectRatio)
  const enableVideoHover = isVideo && videoHoverPreview

  const handleMouseEnter = () => {
    if (!enableVideoHover) return
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => {})
  }

  const handleMouseLeave = () => {
    if (!enableVideoHover) return
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
    setIsHoverPlaying(false)
  }

  const openPreview = () => {
    if (isVideo) {
      const video = videoRef.current
      if (video) {
        video.pause()
        video.currentTime = 0
      }
      setIsHoverPlaying(false)
    }
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isVideo ? (
          <>
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
          </>
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
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={`${contentOverlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
              aria-label={previewLabel}
              onClick={(e) => {
                e.stopPropagation()
                openPreview()
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
              aria-label={downloadLabel}
              asChild
            >
              <a href={downloadHref} download={item.name} onClick={(e) => e.stopPropagation()}>
                <Download className="h-5 w-5 sm:h-4 sm:w-4" />
              </a>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={`${contentOverlayIconButtonBase} bg-white/95 text-destructive hover:bg-white`}
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
