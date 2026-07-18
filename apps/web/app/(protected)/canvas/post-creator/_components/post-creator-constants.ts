export const POST_IMAGE_WIDTH = 1080
export const POST_IMAGE_HEIGHT = 1350
export const POST_IMAGE_ASPECT_RATIO = '4 / 5'

/** Maximum reference photos attached in the prompt panel. */
export const MAX_ATTACHED_REFERENCE_PHOTOS = 5

/** Maximum total references per generation (1 template + up to 5 product photos). */
export const MAX_GENERATION_REFERENCES = 6

/**
 * Visible width when a 4:5 post is center-cropped to a 3:4 profile-grid thumbnail
 * (Instagram clips ~34px from each side at 1080×1350).
 */
export const INSTAGRAM_GRID_THUMBNAIL_VISIBLE_WIDTH = 1012

/** Pixels cropped from left/right when a 4:5 post appears as a 3:4 profile-grid thumbnail. */
export const INSTAGRAM_GRID_THUMBNAIL_INSET_X =
  (POST_IMAGE_WIDTH - INSTAGRAM_GRID_THUMBNAIL_VISIBLE_WIDTH) / 2

export const INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT =
  (INSTAGRAM_GRID_THUMBNAIL_INSET_X / POST_IMAGE_WIDTH) * 100

/**
 * Pixels cropped from top/bottom when a 4:5 post appears as a 1:1 profile-grid thumbnail.
 * Kept for older square-grid previews and compact thumbnail contexts.
 */
export const INSTAGRAM_GRID_THUMBNAIL_INSET_Y = (POST_IMAGE_HEIGHT - POST_IMAGE_WIDTH) / 2

export const INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT =
  (INSTAGRAM_GRID_THUMBNAIL_INSET_Y / POST_IMAGE_HEIGHT) * 100

/** Default preview safe-zone horizontal inset (image pixels, each side). */
export const DEFAULT_SAFE_ZONE_INSET_X_PX = 100

/** Default preview safe-zone vertical inset (image pixels, each side). */
export const DEFAULT_SAFE_ZONE_INSET_Y_PX = 100

/** Default solid-color background canvas for fresh-scene generation (opt-in). */
export const DEFAULT_SOLID_BACKGROUND_COLOR = '#ffffff'

/** Opt-in solid background is off until the user enables it in Settings. */
export const DEFAULT_SOLID_BACKGROUND_ENABLED = false

const SOLID_BACKGROUND_HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function isSolidBackgroundHex(color: string): boolean {
  return SOLID_BACKGROUND_HEX_RE.test(color)
}

/** Normalize to `#rrggbb` lowercase, or fall back to the default. */
export function normalizeSolidBackgroundColor(color: string): string {
  const trimmed = color.trim()
  if (isSolidBackgroundHex(trimmed)) {
    return trimmed.toLowerCase()
  }
  return DEFAULT_SOLID_BACKGROUND_COLOR
}

/** Max inset on one side so both sides leave at least 1px of content. */
export function maxSafeZoneInsetPx(dimension: number): number {
  if (!Number.isFinite(dimension) || dimension <= 1) return 0
  return Math.floor((dimension - 1) / 2)
}

export function clampSafeZoneInsetPx(insetPx: number, dimension: number): number {
  if (!Number.isFinite(insetPx) || insetPx < 0) return 0
  return Math.min(Math.floor(insetPx), maxSafeZoneInsetPx(dimension))
}

/** Convert image-pixel insets to overlay percents for the current output size. */
export function safeZoneInsetPercents(
  insetXPx: number,
  insetYPx: number,
  width: number,
  height: number,
): { insetXPercent: number; insetYPercent: number } {
  const clampedX = clampSafeZoneInsetPx(insetXPx, width)
  const clampedY = clampSafeZoneInsetPx(insetYPx, height)
  return {
    insetXPercent: width > 0 ? (clampedX / width) * 100 : 0,
    insetYPercent: height > 0 ? (clampedY / height) * 100 : 0,
  }
}
