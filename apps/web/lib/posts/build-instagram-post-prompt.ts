import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'

import type { GenerationMode } from '@/lib/posts/resolve-generation-references'

export type PromptReference = { type: 'template' } | { type: 'previous-result' } | { type: 'photo' }

export type BuildInstagramPostPromptOptions = {
  userPrompt: string
  mode: GenerationMode
  references?: PromptReference[]
}

function formatInsetPercent(value: number): string {
  return value.toFixed(1)
}

function slotLabel(productIndex: number): string {
  return String.fromCharCode(64 + productIndex)
}

function buildTemplateReferenceLine(index: number): string {
  return `- Reference ${index} — TEMPLATE: the master layout. Use it for background, typography style, slot positions, and decorative elements. Each placeholder region (grey/white product boxes, cups with "PRODUCT IMAGE HERE", generic image icons, diamond-grid mockups) marks exactly where a product photo must be IN-PAINTED — not overlaid on top.`
}

function buildProductReferenceLine(index: number, slotIndex: number): string {
  const slot = slotLabel(slotIndex)
  const ordinal =
    slot === 'A' ? 'first' : slot === 'B' ? 'second' : slot === 'C' ? 'third' : `${slotIndex}th`
  return `- Reference ${index} — PRODUCT (Slot ${slot}): real menu product photo for the ${ordinal} placeholder (reading order: top-left → right). Render this product INSIDE that slot's bounding box as if photographed there. Preserve product identity — silhouette, aspect ratio, plating, colors, portions, and container shape.`
}

function buildPreviousResultReferenceLine(index: number): string {
  return `- Reference ${index} — FILLED RESULT: the current post design from the last generation. Preserve overall composition, layout, and key visual elements unless creative direction asks to change them. Apply requested edits while maintaining photorealistic quality and Instagram-ready polish. Do not reintroduce placeholder boxes, labels, or guide markings.`
}

function buildFreshScenePhotoReferenceLine(index: number): string {
  return `- Reference ${index} — PRODUCT PHOTO: a real menu product photo. Preserve product identity — shape, plating, colors, portions, and key details. Place the product entirely inside the inner composition frame. Do not crop, clip, or partially hide the product at the frame boundary.`
}

function buildIndexedReferenceBlock(references: PromptReference[], mode: GenerationMode): string {
  if (references.length === 0) return ''

  let productSlotIndex = 0
  const lines = references.map((reference, index) => {
    const refNumber = index + 1
    if (reference.type === 'template') {
      return buildTemplateReferenceLine(refNumber)
    }
    if (reference.type === 'previous-result') {
      return buildPreviousResultReferenceLine(refNumber)
    }
    productSlotIndex += 1
    if (mode === 'template-composite') {
      return buildProductReferenceLine(refNumber, productSlotIndex)
    }
    return buildFreshScenePhotoReferenceLine(refNumber)
  })

  const mappingNote =
    mode === 'template-composite'
      ? '\nDefault slot mapping follows reference upload order. Creative direction may override which product fills which placeholder.'
      : ''

  return `REFERENCE IMAGES (in upload order):
${lines.join('\n')}${mappingNote}`
}

function buildSlotFillBlock(): string {
  return `SLOT FILL — IN-PAINT, NOT OVERLAY (CRITICAL):
- This is slot in-painting, NOT sticker compositing. Do not paste product cutouts on top of an unchanged template.
- For each placeholder: (1) erase ALL placeholder pixels in that region — boxes, borders, grey fill, diamond grids, icons, and "PRODUCT IMAGE HERE" text; (2) render the mapped product photo inside the same bounding box; (3) blend edges naturally with the template background.
- Products must sit IN the slot footprint (same position and approximate scale as the placeholder). Do not float products beside, above, or in front of placeholders while leaving the placeholder visible.
- If a product photo includes its own background, remove/replace that background so only the product appears in the slot — the slot area should show the product on the template scene, not a rectangular photo card.
- Zero placeholder UI may remain in the output. If any placeholder marking is still visible, the result is wrong — fix it.`
}

function buildPlaceholderIdentificationBlock(): string {
  return `PLACEHOLDER IDENTIFICATION:
- Treat any region with mock product UI as a slot: white/grey boxes, tapered cup silhouettes, diamond-grid patterns, dashed frames, generic mountain/sun icons, or text like "PRODUCT IMAGE HERE".
- Slot labels under placeholders (e.g. product names printed below a cup) are template text — update them to match creative direction if product names are provided.
- Non-slot decorations (headline area, doodles, background color, logos) are NOT slots — leave them unless creative direction changes text.`
}

function buildTextReplacementBlock(): string {
  return `TEXT FROM CREATIVE DIRECTION:
- Apply headline, product names, and label copy from creative direction to the template.
- Replace template placeholder tokens (e.g. {HEADLINE}, partial tokens, or stub text) with the final headline text — preserve the template's font weight, color, and placement.
- Product name labels under each slot should match the mapped product from creative direction.`
}

function buildForbiddenOverlayBlock(): string {
  return `FORBIDDEN:
- Overlaying unchanged product photos on top of visible placeholders.
- Leaving any placeholder box, grid pattern, icon, or "PRODUCT IMAGE HERE" text in the output.
- Placing a product outside its assigned slot while the slot still shows placeholder art.
- Collage/sticker-style floating cutouts that ignore slot geometry.`
}

function buildPreserveReplaceRemoveBlock(): string {
  return `PRESERVE / REPLACE / REMOVE:
- PRESERVE from template: background color/texture, headline typography style, decorative doodles, logos, and layout grid — outside placeholder pixels.
- REPLACE: every placeholder pixel region with the mapped product photo, in-painted to fit the slot.
- REMOVE completely: placeholder boxes, diamond grids, mock cup fills, generic icons, "PRODUCT IMAGE HERE", and any guide/label inside placeholder areas.`
}

function buildProductFidelityBlock(): string {
  return `PRODUCT FIDELITY (NON-NEGOTIABLE):
- Treat each product reference as the source of truth for the food or drink itself.
- Preserve silhouette, aspect ratio, plating arrangement, portion size, colors, textures, garnish placement, and container shape (cup, plate, liner).
- Do NOT stretch, squash, warp, morph, merge, or redesign the food into a different dish.
- Scale uniformly to fit the slot bounding box (lock aspect ratio). The product should fill most of the slot area; shrink the product if needed, never leave placeholder art visible around it.
- Match the product's camera angle to the slot when possible; slight rotation only if the slot perspective requires it.`
}

function buildIntegrationBlock(): string {
  return `INTEGRATION (after in-painting each slot):
- Each product should look photographed in the template scene — not pasted as a flat sticker.
- Add subtle contact shadow and edge grounding consistent with the template lighting.
- Do not relight the product into a different dish; do not change template background exposure unless creative direction requests it.
- Natural food textures and appetizing colors; no plastic or waxy food.`
}

function buildCompletionChecklistBlock(): string {
  return `COMPLETION CHECKLIST (verify before output):
- [ ] Every placeholder region is fully erased — no boxes, grids, icons, or "PRODUCT IMAGE HERE" remain.
- [ ] Each mapped product appears inside its slot footprint, not floating on top of an unchanged placeholder.
- [ ] Products match their reference photos (recognizable dish/drink).
- [ ] Headline and product labels match creative direction; placeholder tokens replaced.
- [ ] Template background, doodles, and non-slot design unchanged unless creative direction says otherwise.`
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

function buildCompositionBlock(mode: GenerationMode): string {
  const insetXPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT)
  const insetYPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT)

  if (mode === 'template-composite') {
    return `COMPOSITION:
- The template defines primary layout, slot positions, and overall composition.
- Ensure filled products remain fully inside the inner grid-safe frame when possible (~${insetXPercent}% inset from left/right, ~${insetYPercent}% from top/bottom).
- If the template intentionally extends elements into margins, follow the template; do not auto-crop or reposition slots.
- Do not add visible guides, boxes, rectangles, borders, frames, masks, white blocks, or overlay markings of any kind in the output.`
  }

  return `COMPOSITION (NON-NEGOTIABLE):
- Imagine an invisible inner composition frame inset ~${insetXPercent}% from the left and right edges and ~${insetYPercent}% from the top and bottom. This frame is a cropping guide only — never draw, outline, or render it.
- All hero subjects — food, drinks, plates, and products — must be fully inside this frame.
- Background, texture, and atmosphere may extend into the outer margins; products must not.
- Keep products centered horizontally within the frame with comfortable padding.
- Leave intentional negative space; do not push products into the outer crop margins.
- Do not add visible guides, boxes, rectangles, borders, frames, masks, white blocks, or overlay markings of any kind.`
}

function buildOutputBlock(): string {
  return `OUTPUT:
- Aspect ratio 4:5, ${POST_IMAGE_WIDTH}×${POST_IMAGE_HEIGHT} pixels.
- Instagram-ready, no watermarks, no UI chrome.`
}

function buildTemplateCompositePrompt(userPrompt: string, references: PromptReference[]): string {
  const trimmed = userPrompt.trim()
  const referenceBlock =
    references.length > 0
      ? `\n\n${buildIndexedReferenceBlock(references, 'template-composite')}`
      : ''

  return `You are compositing real product photos into a fixed Instagram post TEMPLATE.

TASK:
In-paint each placeholder region in the template with the corresponding product photo.
Erase placeholder art completely and render the product inside the same slot bounds.
The result must look like one finished design — not a template with photos pasted on top.

${buildOutputBlock()}

${buildSlotFillBlock()}

${buildCompositionBlock('template-composite')}${referenceBlock}

${buildPlaceholderIdentificationBlock()}

${buildPreserveReplaceRemoveBlock()}

${buildProductFidelityBlock()}

${buildTextReplacementBlock()}

${buildIntegrationBlock()}

${buildForbiddenOverlayBlock()}

${buildCompletionChecklistBlock()}

CREATIVE DIRECTION (headline, product names, slot mapping — map Ref 2, Ref 3, … to slots when order differs):
${trimmed}`
}

function buildFilledEditPrompt(userPrompt: string, references: PromptReference[]): string {
  const trimmed = userPrompt.trim()
  const referenceBlock =
    references.length > 0 ? `\n\n${buildIndexedReferenceBlock(references, 'filled-edit')}` : ''
  const photographyBlock = `\n\n${buildPostEditPhotographyBlock()}`

  return `You are editing a photorealistic Instagram portrait post image.

${buildOutputBlock()}

${buildCompositionBlock('filled-edit')}${referenceBlock}${photographyBlock}

CREATIVE DIRECTION (apply only the requested edits):
${trimmed}`
}

function buildFreshScenePrompt(userPrompt: string, references: PromptReference[]): string {
  const trimmed = userPrompt.trim()
  const referenceBlock =
    references.length > 0 ? `\n\n${buildIndexedReferenceBlock(references, 'fresh-scene')}` : ''
  const hasPreviousResult = references.some((reference) => reference.type === 'previous-result')
  const photographyBlock = `\n\n${hasPreviousResult ? buildPostEditPhotographyBlock() : buildPhotographyLightingBlock()}`

  return `You are generating a photorealistic Instagram portrait post image.

${buildOutputBlock()}

${buildCompositionBlock('fresh-scene')}${referenceBlock}${photographyBlock}

CREATIVE DIRECTION (follow the user's vision):
${trimmed}`
}

export function detectPromptMode(references: PromptReference[]): GenerationMode {
  const hasTemplate = references.some((reference) => reference.type === 'template')
  const hasPrevious = references.some((reference) => reference.type === 'previous-result')
  const productCount = references.filter((reference) => reference.type === 'photo').length

  if (hasTemplate && productCount > 0) {
    return 'template-composite'
  }
  if (hasPrevious && !hasTemplate && productCount === 0) {
    return 'filled-edit'
  }
  return 'fresh-scene'
}

export function buildInstagramPostPrompt({
  userPrompt,
  mode,
  references = [],
}: BuildInstagramPostPromptOptions): string {
  switch (mode) {
    case 'template-composite':
      return buildTemplateCompositePrompt(userPrompt, references)
    case 'filled-edit':
      return buildFilledEditPrompt(userPrompt, references)
    case 'fresh-scene':
      return buildFreshScenePrompt(userPrompt, references)
  }
}
