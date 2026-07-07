import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'

export type ReferenceImageSource = 'photo' | 'post' | 'mixed'

export type BuildInstagramPostPromptOptions = {
  userPrompt: string
  referenceImageCount?: number
  referenceImageSource?: ReferenceImageSource
}

function formatInsetPercent(value: number): string {
  return value.toFixed(1)
}

function buildPhotoReferenceImagesBlock(referenceImageCount: number): string {
  return `REFERENCE IMAGES:
- You receive ${referenceImageCount} reference photo(s) showing real menu products.
- Preserve each product's identity: shape, plating, colors, portions, and key details.
- Place every referenced product entirely inside the inner composition frame.
- Do not crop, clip, or partially hide any product at the frame boundary.`
}

function buildPostEditReferenceImagesBlock(referenceImageCount: number): string {
  return `REFERENCE IMAGE:
- You receive ${referenceImageCount} reference image(s) of the current post design.
- Preserve the overall composition, layout, and key visual elements unless the creative direction asks to change them.
- Apply the requested edits while maintaining photorealistic quality and Instagram-ready polish.`
}

function buildReferenceImagesBlock(
  referenceImageCount: number,
  referenceImageSource: ReferenceImageSource,
): string {
  if (referenceImageSource === 'post') {
    return buildPostEditReferenceImagesBlock(referenceImageCount)
  }
  return buildPhotoReferenceImagesBlock(referenceImageCount)
}

export function buildInstagramPostPrompt({
  userPrompt,
  referenceImageCount = 0,
  referenceImageSource = 'photo',
}: BuildInstagramPostPromptOptions): string {
  const trimmed = userPrompt.trim()
  const insetXPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT)
  const insetYPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT)

  const referenceBlock =
    referenceImageCount > 0
      ? `\n\n${buildReferenceImagesBlock(referenceImageCount, referenceImageSource)}`
      : ''

  return `You are generating a photorealistic Instagram portrait post image.

OUTPUT:
- Aspect ratio 4:5, ${POST_IMAGE_WIDTH}×${POST_IMAGE_HEIGHT} pixels.
- Instagram-ready, no watermarks, no UI chrome.

COMPOSITION (NON-NEGOTIABLE):
- Imagine an invisible inner composition frame inset ~${insetXPercent}% from the left and right edges and ~${insetYPercent}% from the top and bottom. This frame is a cropping guide only — never draw, outline, or render it.
- All hero subjects — food, drinks, plates, and products — must be fully inside this frame.
- Background, texture, and atmosphere may extend into the outer margins; products must not.
- Keep products centered horizontally within the frame with comfortable padding.
- Leave intentional negative space; do not push products into the outer crop margins.
- Do not add visible guides, boxes, rectangles, borders, frames, masks, white blocks, or overlay markings of any kind.${referenceBlock}

CREATIVE DIRECTION (follow the user's vision):
${trimmed}`
}
