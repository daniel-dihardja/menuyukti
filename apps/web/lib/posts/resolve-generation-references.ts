import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

export type GenerationReference =
  | { type: 'template'; name: string }
  | { type: 'previous-result'; filename: string }
  | { type: 'photo'; name: string }

export type GenerationMode = 'template-composite' | 'filled-edit' | 'fresh-scene'

export type ResolveGenerationReferencesInput = {
  templateImage: PostCreatorReferenceImage | null
  referenceImages: PostCreatorReferenceImage[]
  usePreviousResult: boolean
  previewMediaS3Key: string | null | undefined
}

export type ResolveGenerationReferencesResult = {
  mode: GenerationMode
  references: GenerationReference[]
  tooManyReferences: boolean
  hasTemplatePreviousConflict: boolean
}

function enabledPhotos(referenceImages: PostCreatorReferenceImage[]): PostCreatorReferenceImage[] {
  return referenceImages.filter((image) => image.enabled)
}

export function detectGenerationMode(input: {
  templateImage: PostCreatorReferenceImage | null
  enabledPhotoCount: number
  usePreviousResult: boolean
  previewMediaS3Key: string | null | undefined
}): GenerationMode {
  const hasTemplate = input.templateImage != null
  const hasProducts = input.enabledPhotoCount > 0
  const hasPrevious =
    input.usePreviousResult && parsePostMediaFilename(input.previewMediaS3Key) != null

  if (hasTemplate && hasProducts) {
    return 'template-composite'
  }
  if (hasPrevious && !hasTemplate && !hasProducts) {
    return 'filled-edit'
  }
  return 'fresh-scene'
}

export function resolveGenerationReferences(
  input: ResolveGenerationReferencesInput,
): ResolveGenerationReferencesResult {
  const photos = enabledPhotos(input.referenceImages)
  const hasTemplate = input.templateImage != null
  const hasPrevious =
    input.usePreviousResult && parsePostMediaFilename(input.previewMediaS3Key) != null
  const hasTemplatePreviousConflict = hasTemplate && hasPrevious

  const mode = detectGenerationMode({
    templateImage: input.templateImage,
    enabledPhotoCount: photos.length,
    usePreviousResult: input.usePreviousResult,
    previewMediaS3Key: input.previewMediaS3Key,
  })

  const references: GenerationReference[] = []

  if (mode === 'template-composite' && input.templateImage) {
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

  return {
    mode,
    references,
    tooManyReferences: references.length > MAX_GENERATION_REFERENCES,
    hasTemplatePreviousConflict,
  }
}
