/**
 * Format + quality → Leonardo width/height pairs for post generation.
 * Nano Banana 2 pairs from https://docs.leonardo.ai/docs/nano-banana-2
 */

import {
  DEFAULT_LEONARDO_POST_MODEL,
  getLeonardoPostModel,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'

export const POST_IMAGE_FORMAT_IDS = ['feed', 'tall', 'square', 'story', 'wide'] as const

export type PostImageFormatId = (typeof POST_IMAGE_FORMAT_IDS)[number]

/** @deprecated Use POST_IMAGE_FORMAT_IDS — kept as an alias for call sites that listed explicit formats. */
export const POST_IMAGE_EXPLICIT_FORMAT_IDS = POST_IMAGE_FORMAT_IDS

export type PostImageExplicitFormatId = PostImageFormatId

export const POST_IMAGE_QUALITY_IDS = ['standard', 'high', 'ultra'] as const

export type PostImageQualityId = (typeof POST_IMAGE_QUALITY_IDS)[number]

export const DEFAULT_POST_IMAGE_FORMAT: PostImageFormatId = 'feed'
export const DEFAULT_POST_IMAGE_QUALITY: PostImageQualityId = 'standard'

export type OutputDimensions = { width: number; height: number }

/** Target aspect ratios for formats (w:h). */
const FORMAT_RATIO: Record<PostImageFormatId, { w: number; h: number }> = {
  feed: { w: 4, h: 5 },
  tall: { w: 3, h: 4 },
  square: { w: 1, h: 1 },
  story: { w: 9, h: 16 },
  wide: { w: 16, h: 9 },
}

/**
 * Nano Banana 2 documented pairs by aspect × tier.
 * @see https://docs.leonardo.ai/docs/nano-banana-2
 */
const NANO_BANANA_2_PAIRS: Record<
  PostImageFormatId,
  Record<PostImageQualityId, OutputDimensions>
> = {
  square: {
    standard: { width: 1024, height: 1024 },
    high: { width: 2048, height: 2048 },
    ultra: { width: 4096, height: 4096 },
  },
  feed: {
    // 4:5
    standard: { width: 928, height: 1152 },
    high: { width: 1856, height: 2304 },
    ultra: { width: 3712, height: 4608 },
  },
  tall: {
    // 3:4
    standard: { width: 896, height: 1200 },
    high: { width: 1792, height: 2400 },
    ultra: { width: 3584, height: 4800 },
  },
  story: {
    // 9:16
    standard: { width: 768, height: 1376 },
    high: { width: 1536, height: 2752 },
    ultra: { width: 3072, height: 5504 },
  },
  wide: {
    // 16:9
    standard: { width: 1376, height: 768 },
    high: { width: 2752, height: 1536 },
    ultra: { width: 5504, height: 3072 },
  },
}

/** Relative cost labels by quality tier (pixel-area approximation). */
export const POST_IMAGE_QUALITY_COST_MULTIPLIER: Record<PostImageQualityId, number> = {
  standard: 1,
  high: 4,
  ultra: 16,
}

export function isPostImageFormatId(value: unknown): value is PostImageFormatId {
  return typeof value === 'string' && (POST_IMAGE_FORMAT_IDS as readonly string[]).includes(value)
}

export function isPostImageQualityId(value: unknown): value is PostImageQualityId {
  return typeof value === 'string' && (POST_IMAGE_QUALITY_IDS as readonly string[]).includes(value)
}

export function isPostImageExplicitFormatId(value: unknown): value is PostImageExplicitFormatId {
  return isPostImageFormatId(value)
}

/** Width÷height for a format (e.g. story → `9/16`). */
export function formatAspectNumber(format: PostImageFormatId): number {
  const { w, h } = FORMAT_RATIO[format]
  return w / h
}

/** CSS aspect-ratio value for preview frames (`4 / 5`). */
export function formatAspectCss(format: PostImageFormatId): string {
  const { w, h } = FORMAT_RATIO[format]
  return `${w} / ${h}`
}

/** Whether Ultra (4K) is available for the model. Flash maxes around 1344. */
export function isQualityAvailable(
  modelId: LeonardoPostModelId,
  quality: PostImageQualityId,
): boolean {
  if (quality !== 'ultra') return true
  return modelId !== 'gemini-2.5-flash-image'
}

/** Clamp quality when the model cannot run Ultra. */
export function clampQualityForModel(
  modelId: LeonardoPostModelId,
  quality: PostImageQualityId,
): PostImageQualityId {
  if (isQualityAvailable(modelId, quality)) return quality
  return 'high'
}

function snapToAllowed(n: number, allowed: readonly number[]): number {
  const fallback = allowed.includes(1024) ? 1024 : (allowed[0] ?? 1024)
  if (!Number.isFinite(n) || n <= 0) return fallback
  let best = fallback
  let bestDiff = Infinity
  for (const d of allowed) {
    const diff = Math.abs(d - n)
    if (diff < bestDiff) {
      bestDiff = diff
      best = d
    }
  }
  return best
}

/**
 * Snap raw width/height to the nearest allowed pair that preserves aspect ratio.
 * Avoids Nano Banana 2's silent 1:1 fallback from mismatched independent snaps.
 */
export function snapToNearestLeonardoPair(
  modelId: LeonardoPostModelId,
  width: number,
  height: number,
): OutputDimensions {
  const model = getLeonardoPostModel(modelId)
  const targetRatio = width > 0 && height > 0 ? width / height : 1

  let best: OutputDimensions = {
    width: snapToAllowed(width, model.allowedWidths),
    height: snapToAllowed(height, model.allowedHeights),
  }
  let bestScore = Infinity

  for (const w of model.allowedWidths) {
    for (const h of model.allowedHeights) {
      const ratio = w / h
      const ratioDiff = Math.abs(ratio - targetRatio)
      const sizeDiff = Math.abs(w - width) + Math.abs(h - height)
      // Prefer ratio match, then total size proximity
      const score = ratioDiff * 10_000 + sizeDiff
      if (score < bestScore) {
        bestScore = score
        best = { width: w, height: h }
      }
    }
  }

  return best
}

/**
 * Target pixel size for a format × quality before model-specific snapping.
 * Uses Nano Banana 2 documented pairs as the canonical size ladder.
 */
function targetDimensionsForFormatQuality(
  format: PostImageFormatId,
  quality: PostImageQualityId,
): OutputDimensions {
  return NANO_BANANA_2_PAIRS[format][quality]
}

/**
 * Resolve Leonardo output dimensions for format + quality.
 */
export function resolveLeonardoOutputDimensions(input: {
  model: LeonardoPostModelId
  format: PostImageFormatId
  quality: PostImageQualityId
}): OutputDimensions {
  const model = input.model || DEFAULT_LEONARDO_POST_MODEL
  const quality = clampQualityForModel(model, input.quality)
  const target = targetDimensionsForFormatQuality(input.format, quality)
  return snapToNearestLeonardoPair(model, target.width, target.height)
}
