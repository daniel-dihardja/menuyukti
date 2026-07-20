import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import { compileStyleSpec, parsePropertyOverrides, type StyleSpec } from '@/lib/styles/style-spec'

import type { GenerationMode } from '@/lib/posts/resolve-generation-references'

export type PromptReference =
  | { type: 'style' }
  | { type: 'previous-result' }
  | { type: 'photo' }
  | { type: 'background-color'; color: string }

export type OutputDimensions = {
  width: number
  height: number
}

export type StylePackPrompt = {
  name: string
  rules: string
  spec?: StyleSpec | null
}

export type BuildInstagramPostPromptOptions = {
  userPrompt: string
  mode: GenerationMode
  references?: PromptReference[]
  /** Override default post pixel dimensions (e.g. to match a previous result). */
  outputDimensions?: OutputDimensions
  /** Optional location style pack injected before creative direction. */
  style?: StylePackPrompt
}

function formatInsetPercent(value: number): string {
  return value.toFixed(1)
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function formatAspectRatio(width: number, height: number): string {
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

function resolveOutputDimensions(dimensions?: OutputDimensions): OutputDimensions {
  return {
    width: dimensions?.width ?? POST_IMAGE_WIDTH,
    height: dimensions?.height ?? POST_IMAGE_HEIGHT,
  }
}

function buildStyleReferenceLine(index: number): string {
  return `- Reference ${index} — STYLE REFERENCE: an example of the desired look. Match its color grade, lighting, mood, and photographic treatment. Do NOT copy its subject, dish, layout, or composition unless creative direction explicitly asks.`
}

function buildFreshScenePhotoReferenceLine(index: number): string {
  return `- Reference ${index} — PRODUCT PHOTO: a real menu product photo. Preserve product identity — shape, plating, colors, portions, and key details. Keep the full product clearly visible with breathing room from the image edges — do not crop or clip it.`
}

function buildPreviousResultReferenceLine(index: number): string {
  return `- Reference ${index} — FILLED RESULT: the current post design from the last generation. Preserve overall composition, layout, and key visual elements unless creative direction asks to change them. Apply requested edits while maintaining photorealistic quality and Instagram-ready polish. Do not reintroduce placeholder boxes, labels, or guide markings.`
}

function buildBackgroundColorReferenceLine(index: number, color: string): string {
  return `- Reference ${index} — BACKGROUND CANVAS: a flat solid field in ${color}. Use it as the scene canvas and exact base background color. Place subjects and products on this field. Do not invent texture, gradients, patterns, or alternate hues unless creative direction asks. This is a flat color field only — there are no slots or placeholders.`
}

function buildIndexedReferenceBlock(references: PromptReference[]): string {
  if (references.length === 0) return ''

  const lines = references.map((reference, index) => {
    const refNumber = index + 1
    if (reference.type === 'style') {
      return buildStyleReferenceLine(refNumber)
    }
    if (reference.type === 'previous-result') {
      return buildPreviousResultReferenceLine(refNumber)
    }
    if (reference.type === 'background-color') {
      return buildBackgroundColorReferenceLine(refNumber, reference.color)
    }
    return buildFreshScenePhotoReferenceLine(refNumber)
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

function buildCompositionBlock(): string {
  const insetXPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT)
  const insetYPercent = formatInsetPercent(INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT)

  return `COMPOSITION (NON-NEGOTIABLE):
- Fill the entire canvas edge to edge as one continuous scene — background, texture, and atmosphere must reach every edge.
- Keep all hero subjects — food, drinks, plates, and products — fully visible and clear of the edges by roughly ${insetXPercent}% left/right and ${insetYPercent}% top/bottom.
- Center products horizontally with comfortable breathing room; leave intentional negative space.
- Do not crop or clip products at the edges. No watermarks or UI chrome.`
}

function buildOutputBlock(mode: GenerationMode, dimensions?: OutputDimensions): string {
  const { width, height } = resolveOutputDimensions(dimensions)
  const ratio = formatAspectRatio(width, height)

  if (mode === 'filled-edit') {
    return `OUTPUT:
- Match the FILLED RESULT reference dimensions exactly: ${width}×${height} pixels (aspect ratio ${ratio}).
- Do not crop, stretch, letterbox, or change the canvas size.
- Instagram-ready, no watermarks, no UI chrome.`
  }

  return `OUTPUT:
- Aspect ratio ${ratio}, ${width}×${height} pixels.
- Instagram-ready, no watermarks, no UI chrome.`
}

function buildStylePackBlock(style: StylePackPrompt, overridesBody?: string): string {
  const body = overridesBody?.trim() || style.rules.trim()
  return `STYLE PACK — "${style.name}":
Apply these visual rules to the entire output (unless creative direction explicitly overrides a detail):
${body}`
}

function resolveStyleAndPrompt(
  userPrompt: string,
  style?: StylePackPrompt,
): { prompt: string; styleBlock?: string } {
  const trimmed = userPrompt.trim()
  if (!style) {
    return { prompt: trimmed }
  }

  if (style.spec) {
    const { overrides, cleanedPrompt } = parsePropertyOverrides(trimmed)
    const { body } = compileStyleSpec(style.spec, overrides)
    return {
      prompt: cleanedPrompt || trimmed,
      styleBlock: buildStylePackBlock(style, body),
    }
  }

  return {
    prompt: trimmed,
    styleBlock: buildStylePackBlock(style),
  }
}

function appendCreativeDirection(
  body: string,
  header: string,
  userPrompt: string,
  style?: StylePackPrompt,
): string {
  const { prompt, styleBlock } = resolveStyleAndPrompt(userPrompt, style)
  const styleSection = styleBlock ? `\n\n${styleBlock}` : ''
  return `${body}${styleSection}

${header}
${prompt}`
}

function buildFilledEditPrompt(
  userPrompt: string,
  references: PromptReference[],
  outputDimensions?: OutputDimensions,
  style?: StylePackPrompt,
): string {
  const trimmed = userPrompt.trim()
  const referenceBlock =
    references.length > 0 ? `\n\n${buildIndexedReferenceBlock(references)}` : ''
  const photographyBlock = `\n\n${buildPostEditPhotographyBlock()}`

  return appendCreativeDirection(
    `You are editing a photorealistic Instagram portrait post image.

${buildOutputBlock('filled-edit', outputDimensions)}

${buildCompositionBlock()}${referenceBlock}${photographyBlock}`,
    'CREATIVE DIRECTION (apply only the requested edits):',
    trimmed,
    style,
  )
}

function buildFreshScenePrompt(
  userPrompt: string,
  references: PromptReference[],
  outputDimensions?: OutputDimensions,
  style?: StylePackPrompt,
): string {
  const trimmed = userPrompt.trim()
  const referenceBlock =
    references.length > 0 ? `\n\n${buildIndexedReferenceBlock(references)}` : ''
  const hasPreviousResult = references.some((reference) => reference.type === 'previous-result')
  const photographyBlock = `\n\n${hasPreviousResult ? buildPostEditPhotographyBlock() : buildPhotographyLightingBlock()}`

  return appendCreativeDirection(
    `You are generating a photorealistic Instagram portrait post image.

${buildOutputBlock('fresh-scene', outputDimensions)}

${buildCompositionBlock()}${referenceBlock}${photographyBlock}`,
    "CREATIVE DIRECTION (follow the user's vision):",
    trimmed,
    style,
  )
}

export function detectPromptMode(references: PromptReference[]): GenerationMode {
  const hasPrevious = references.some((reference) => reference.type === 'previous-result')
  const productCount = references.filter((reference) => reference.type === 'photo').length

  if (hasPrevious && productCount === 0) {
    return 'filled-edit'
  }
  return 'fresh-scene'
}

export function buildInstagramPostPrompt({
  userPrompt,
  mode,
  references = [],
  outputDimensions,
  style,
}: BuildInstagramPostPromptOptions): string {
  switch (mode) {
    case 'filled-edit':
      return buildFilledEditPrompt(userPrompt, references, outputDimensions, style)
    case 'fresh-scene':
      return buildFreshScenePrompt(userPrompt, references, outputDimensions, style)
  }
}
