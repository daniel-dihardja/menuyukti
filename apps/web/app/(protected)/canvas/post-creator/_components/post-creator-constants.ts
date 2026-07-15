export const POST_IMAGE_WIDTH = 1080
export const POST_IMAGE_HEIGHT = 1350
export const POST_IMAGE_ASPECT_RATIO = '4 / 5'

/** Maximum reference photos attached in the prompt panel. */
export const MAX_ATTACHED_REFERENCE_PHOTOS = 5

/** Maximum total references per generation (1 previous result + up to 5 photos). */
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
