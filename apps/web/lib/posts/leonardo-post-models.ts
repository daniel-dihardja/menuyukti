/**
 * Leonardo v2 Nano Banana models that support image_reference for post generation.
 * @see https://docs.leonardo.ai/docs/nano-banana
 * @see https://docs.leonardo.ai/docs/nano-banana-2
 * @see https://docs.leonardo.ai/docs/nano-banana-pro
 */

export const LEONARDO_POST_MODEL_IDS = [
  'gemini-2.5-flash-image',
  'nano-banana-2',
  'gemini-image-2',
] as const

export type LeonardoPostModelId = (typeof LEONARDO_POST_MODEL_IDS)[number]

export type LeonardoPostModelDefinition = {
  id: LeonardoPostModelId
  /** next-intl key segment under postCreator.prompt.model.options (must not contain dots). */
  messageKey: string
  default: boolean
  allowedWidths: readonly number[]
  allowedHeights: readonly number[]
}

/** Nano Banana (Gemini 2.5 Flash Image) — width and height share one list; 0 omitted (match input). */
const NANO_BANANA_FLASH_DIMS = [672, 768, 832, 864, 896, 1024, 1152, 1184, 1248, 1344] as const

/** Nano Banana Pro — 0 omitted from snap lists. */
const NANO_BANANA_PRO_DIMS = [
  672, 768, 848, 896, 928, 1024, 1152, 1200, 1264, 1344, 1376, 1536, 1696, 1792, 1856, 2048, 2304,
  2400, 2528, 2688, 2752, 3072, 3392, 3584, 3712, 4096, 4608, 4800, 5056, 5504,
] as const

const NANO_BANANA_2_WIDTHS = [
  768, 848, 896, 928, 1024, 1152, 1200, 1264, 1376, 1536, 1584, 1696, 1792, 1856, 2048, 2304, 2400,
  2528, 2752, 3072, 3168, 3392, 3584, 3712, 4096, 4608, 4800, 5056, 5504, 6336,
] as const

const NANO_BANANA_2_HEIGHTS = [
  672, 768, 848, 896, 928, 1024, 1152, 1200, 1264, 1344, 1376, 1536, 1696, 1792, 1856, 2048, 2304,
  2400, 2528, 2688, 2752, 3072, 3392, 3584, 3712, 4096, 4608, 4800, 5056, 5504,
] as const

export const LEONARDO_POST_MODELS: readonly LeonardoPostModelDefinition[] = [
  {
    id: 'gemini-2.5-flash-image',
    messageKey: 'flash',
    default: true,
    allowedWidths: NANO_BANANA_FLASH_DIMS,
    allowedHeights: NANO_BANANA_FLASH_DIMS,
  },
  {
    id: 'nano-banana-2',
    messageKey: 'nanoBanana2',
    default: false,
    allowedWidths: NANO_BANANA_2_WIDTHS,
    allowedHeights: NANO_BANANA_2_HEIGHTS,
  },
  {
    id: 'gemini-image-2',
    messageKey: 'pro',
    default: false,
    allowedWidths: NANO_BANANA_PRO_DIMS,
    allowedHeights: NANO_BANANA_PRO_DIMS,
  },
] as const

export const DEFAULT_LEONARDO_POST_MODEL: LeonardoPostModelId =
  LEONARDO_POST_MODELS.find((model) => model.default)?.id ?? 'gemini-2.5-flash-image'

export function isLeonardoPostModelId(value: unknown): value is LeonardoPostModelId {
  return typeof value === 'string' && (LEONARDO_POST_MODEL_IDS as readonly string[]).includes(value)
}

export function getLeonardoPostModel(
  modelId: LeonardoPostModelId = DEFAULT_LEONARDO_POST_MODEL,
): LeonardoPostModelDefinition {
  return LEONARDO_POST_MODELS.find((model) => model.id === modelId) ?? LEONARDO_POST_MODELS[0]!
}

export function getLeonardoPostModelMessageKey(
  modelId: LeonardoPostModelId,
): LeonardoPostModelDefinition['messageKey'] {
  return getLeonardoPostModel(modelId).messageKey
}

function snapToAllowedDimension(n: number, allowed: readonly number[]): number {
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

export function snapLeonardoPostDimension(
  modelId: LeonardoPostModelId,
  n: number,
  axis: 'width' | 'height' = 'width',
): number {
  const model = getLeonardoPostModel(modelId)
  const allowed = axis === 'height' ? model.allowedHeights : model.allowedWidths
  return snapToAllowedDimension(n, allowed)
}
