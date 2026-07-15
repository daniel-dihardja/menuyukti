import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'

export type PromptReference = { type: 'previous-result' } | { type: 'photo' }

export type BuildInstagramPostPromptOptions = {
  userPrompt: string
  references?: PromptReference[]
}

function formatInsetPercent(value: number): string {
  return value.toFixed(1)
}

function buildPreviousResultReferenceLine(index: number): string {
  return `- Reference ${index} — PREVIOUS RESULT: the current post design from the last generation. Preserve overall composition, layout, and key visual elements unless creative direction asks to change them. Apply requested edits while maintaining photorealistic quality and Instagram-ready polish. Do not reintroduce placeholder boxes, labels, or guide markings.`
}

function buildPhotoReferenceLine(index: number): string {
  return `- Reference ${index} — PRODUCT PHOTO: a real menu product photo. Preserve product identity — shape, plating, colors, portions, and key details. Place the product entirely inside the inner composition frame. Do not crop, clip, or partially hide the product at the frame boundary.`
}

function buildIndexedReferenceBlock(references: PromptReference[]): string {
  if (references.length === 0) return ''

  const lines = references.map((reference, index) => {
    const refNumber = index + 1
    return reference.type === 'previous-result'
      ? buildPreviousResultReferenceLine(refNumber)
      : buildPhotoReferenceLine(refNumber)
  })

  return `REFERENCE IMAGES (in upload order):
${lines.join('\n')}`
}

function buildPhotographyLightingBlock(): string {
  return `PHOTOGRAPHY & LIGHTING (default unless creative direction overrides):
- Commercial editorial food photography — not illustration, not CGI.
- Warm directional window light from upper-left or upper-right (~3200–4000K); soft shadows; no harsh flash or cool blue cast.
- 45–60° hero angle for plated dishes (or overhead flat lay when the dish suits it); shallow depth of field; sharp focus on the hero dish; soft background bokeh.
- Minimal, intentional props and surfaces that support the scene without competing with the food.
- Natural food textures and appetizing colors; no plastic or waxy food, no distorted utensils or hands, no text or logos.`
}

function buildPostEditPhotographyBlock(): string {
  return `PHOTOGRAPHY & LIGHTING (default unless creative direction overrides):
- Preserve the reference image's composition, camera angle, and lighting unless creative direction explicitly requests changes.
- Apply only the edits described in creative direction; maintain photorealistic Instagram polish throughout.
- Natural food textures and appetizing colors; no plastic or waxy food, no distorted utensils or hands, no text or logos.`
}

function buildPhotographyBlock(references: PromptReference[]): string {
  const hasPreviousResult = references.some((reference) => reference.type === 'previous-result')
  if (hasPreviousResult) {
    return buildPostEditPhotographyBlock()
  }
  return buildPhotographyLightingBlock()
}

export function buildInstagramPostPrompt({
  userPrompt,
  references = [],
}: BuildInstagramPostPromptOptions): string {
  const trimmed = userPrompt.trim()
  const insetXPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT)
  const insetYPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT)

  const referenceBlock =
    references.length > 0 ? `\n\n${buildIndexedReferenceBlock(references)}` : ''

  const photographyBlock = `\n\n${buildPhotographyBlock(references)}`

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
- Do not add visible guides, boxes, rectangles, borders, frames, masks, white blocks, or overlay markings of any kind.${referenceBlock}${photographyBlock}

CREATIVE DIRECTION (follow the user's vision):
${trimmed}`
}
