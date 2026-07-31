export type ContentCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
  mediaType?: 'image' | 'video'
  /** Human-readable label when available; otherwise UI may hide the storage filename. */
  displayName?: string | null
}

export function contentMediaType(item: ContentCatalogItem): 'image' | 'video' {
  return item.mediaType ?? 'image'
}

export const CONTENT_MEDIA_GRID_CLASS =
  'grid grid-cols-2 items-start justify-items-center gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

export const DEFAULT_CONTENT_ASPECT_RATIO = '9 / 16'

export const contentTileOverlayReveal =
  'opacity-100 transition-opacity duration-300 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100'

export const contentOverlayIconButtonBase =
  'h-11 w-11 shrink-0 touch-manipulation rounded-full shadow-md transition-transform duration-150 active:scale-[0.97] sm:h-9 sm:w-9 sm:active:scale-100'

export function aspectRatioForDimensions(
  dims: { width: number; height: number } | undefined,
  defaultAspectRatio: string = DEFAULT_CONTENT_ASPECT_RATIO,
): string {
  if (dims && dims.width > 0 && dims.height > 0) {
    return `${dims.width} / ${dims.height}`
  }
  return defaultAspectRatio
}
