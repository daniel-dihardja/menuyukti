import type { PostCreatorReferenceImage } from '@/app/(protected)/canvas/post-creator/_components/post-creator-thumbnails-pane'
import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

export type GenerationReference =
  | { type: 'previous-result'; filename: string }
  | { type: 'photo'; name: string }

export type ResolveGenerationReferencesInput = {
  referenceImages: PostCreatorReferenceImage[]
  usePreviousResult: boolean
  previewMediaS3Key: string | null | undefined
}

export type ResolveGenerationReferencesResult = {
  references: GenerationReference[]
  tooManyReferences: boolean
}

export function resolveGenerationReferences(
  input: ResolveGenerationReferencesInput,
): ResolveGenerationReferencesResult {
  const references: GenerationReference[] = []

  if (input.usePreviousResult) {
    const filename = parsePostMediaFilename(input.previewMediaS3Key)
    if (filename) {
      references.push({ type: 'previous-result', filename })
    }
  }

  for (const image of input.referenceImages) {
    if (!image.enabled) continue
    references.push({ type: 'photo', name: image.name })
  }

  return {
    references,
    tooManyReferences: references.length > MAX_GENERATION_REFERENCES,
  }
}
