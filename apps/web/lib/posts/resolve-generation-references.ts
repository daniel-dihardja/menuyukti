import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import {
  MAX_GENERATION_REFERENCES,
  normalizeSolidBackgroundColor,
} from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

export type GenerationReference =
  | { type: 'previous-result'; filename: string }
  | { type: 'photo'; name: string }
  | { type: 'background-color'; color: string }

export type GenerationMode = 'filled-edit' | 'fresh-scene'

export type ResolveGenerationReferencesInput = {
  referenceImages: PostCreatorReferenceImage[]
  previewMediaS3Key: string | null | undefined
  /** When false, never attach previous-result even if previewMediaS3Key is set. Default true. */
  includePreviousResult?: boolean
  /** When true, reserve one slot for a server-side style reference image. */
  styleSelected?: boolean
  solidBackgroundEnabled?: boolean
  solidBackgroundColor?: string
}

export type ResolveGenerationReferencesResult = {
  mode: GenerationMode
  references: GenerationReference[]
  tooManyReferences: boolean
}

function enabledPhotos(referenceImages: PostCreatorReferenceImage[]): PostCreatorReferenceImage[] {
  return referenceImages.filter((image) => image.enabled)
}

export function detectGenerationMode(input: {
  enabledPhotoCount: number
  previewMediaS3Key: string | null | undefined
}): GenerationMode {
  const hasProducts = input.enabledPhotoCount > 0
  const hasPrevious = parsePostMediaFilename(input.previewMediaS3Key) != null

  if (hasPrevious && !hasProducts) {
    return 'filled-edit'
  }
  return 'fresh-scene'
}

export function resolveGenerationReferences(
  input: ResolveGenerationReferencesInput,
): ResolveGenerationReferencesResult {
  const photos = enabledPhotos(input.referenceImages)
  const includePreviousResult = input.includePreviousResult !== false
  const effectivePreviewKey = includePreviousResult ? input.previewMediaS3Key : null
  const hasPrevious = parsePostMediaFilename(effectivePreviewKey) != null

  const mode = detectGenerationMode({
    enabledPhotoCount: photos.length,
    previewMediaS3Key: effectivePreviewKey,
  })

  const references: GenerationReference[] = []

  if (mode === 'filled-edit') {
    const filename = parsePostMediaFilename(effectivePreviewKey)
    if (filename) {
      references.push({ type: 'previous-result', filename })
    }
  } else {
    if (hasPrevious) {
      const filename = parsePostMediaFilename(effectivePreviewKey)
      if (filename) {
        references.push({ type: 'previous-result', filename })
      }
    }
    for (const image of photos) {
      references.push({ type: 'photo', name: image.name })
    }
  }

  const hasPreviousRef = references.some((reference) => reference.type === 'previous-result')
  if (input.solidBackgroundEnabled && !hasPreviousRef) {
    references.unshift({
      type: 'background-color',
      color: normalizeSolidBackgroundColor(input.solidBackgroundColor ?? ''),
    })
  }

  return {
    mode,
    references,
    tooManyReferences:
      references.length > MAX_GENERATION_REFERENCES - (input.styleSelected ? 1 : 0),
  }
}
