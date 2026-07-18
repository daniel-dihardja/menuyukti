import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import {
  MAX_GENERATION_REFERENCES,
  normalizeSolidBackgroundColor,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

export type GenerationReference =
  | { type: 'template'; name: string }
  | { type: 'previous-result'; filename: string }
  | { type: 'photo'; name: string }
  | { type: 'background-color'; color: string }

export type GenerationMode = 'template-composite' | 'filled-edit' | 'fresh-scene'

export type ResolveGenerationReferencesInput = {
  templateImage: PostCreatorReferenceImage | null
  referenceImages: PostCreatorReferenceImage[]
  previewMediaS3Key: string | null | undefined
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
  templateImage: PostCreatorReferenceImage | null
  enabledPhotoCount: number
  previewMediaS3Key: string | null | undefined
}): GenerationMode {
  const hasTemplate = input.templateImage != null
  const hasProducts = input.enabledPhotoCount > 0
  const hasPrevious = parsePostMediaFilename(input.previewMediaS3Key) != null

  // Template alone is enough (headline/style edits); products are optional fills.
  if (hasTemplate) {
    return 'template-composite'
  }
  if (hasPrevious && !hasProducts) {
    return 'filled-edit'
  }
  return 'fresh-scene'
}

export function resolveGenerationReferences(
  input: ResolveGenerationReferencesInput,
): ResolveGenerationReferencesResult {
  const photos = enabledPhotos(input.referenceImages)
  const hasPrevious = parsePostMediaFilename(input.previewMediaS3Key) != null

  const mode = detectGenerationMode({
    templateImage: input.templateImage,
    enabledPhotoCount: photos.length,
    previewMediaS3Key: input.previewMediaS3Key,
  })

  const references: GenerationReference[] = []

  // Always attach the layout template when selected (products optional).
  if (input.templateImage) {
    references.push({ type: 'template', name: input.templateImage.name })
    for (const image of photos) {
      references.push({ type: 'photo', name: image.name })
    }
  } else if (mode === 'filled-edit') {
    const filename = parsePostMediaFilename(input.previewMediaS3Key)
    if (filename) {
      references.push({ type: 'previous-result', filename })
    }
  } else {
    if (hasPrevious) {
      const filename = parsePostMediaFilename(input.previewMediaS3Key)
      if (filename) {
        references.push({ type: 'previous-result', filename })
      }
    }
    for (const image of photos) {
      references.push({ type: 'photo', name: image.name })
    }
  }

  const hasTemplateRef = references.some((reference) => reference.type === 'template')
  const hasPreviousRef = references.some((reference) => reference.type === 'previous-result')
  if (input.solidBackgroundEnabled && !hasTemplateRef && !hasPreviousRef) {
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
