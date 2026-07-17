import {
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import type { OutputDimensions } from '@/lib/posts/build-instagram-post-prompt'
import type { GenerationMode } from '@/lib/posts/resolve-generation-references'

import type { PostCreatorImageVersion, PostCreatorPage } from './post-creator-types'

/**
 * Resolve Leonardo output size: template wins for composites; otherwise keep the
 * previous filled result's pixel size so square (or other) edits aren't forced into 4:5.
 */
export function resolveGenerationOutputDimensions(input: {
  mode: GenerationMode
  templateDimensions?: OutputDimensions
  previousResultDimensions?: OutputDimensions
}): OutputDimensions {
  if (input.mode === 'template-composite' && input.templateDimensions) {
    return input.templateDimensions
  }
  if (input.previousResultDimensions) {
    return input.previousResultDimensions
  }
  return { width: POST_IMAGE_WIDTH, height: POST_IMAGE_HEIGHT }
}

export function resolvePageImageVersions(page: {
  imageUrl: string | null
  mediaS3Key?: string | null
  imageVersions?: PostCreatorImageVersion[]
}): PostCreatorImageVersion[] {
  if (page.imageVersions && page.imageVersions.length > 0) {
    return page.imageVersions
  }
  if (page.imageUrl) {
    return [
      {
        id: 'current',
        mediaS3Key: page.mediaS3Key ?? '',
        imageUrl: page.imageUrl,
        createdAt: '',
      },
    ]
  }
  return []
}

export function resolvePostImageVersionIndex(
  versions: PostCreatorImageVersion[],
  activeMediaS3Key: string | null | undefined,
): number {
  if (activeMediaS3Key) {
    const byKey = versions.findIndex((version) => version.mediaS3Key === activeMediaS3Key)
    if (byKey >= 0) {
      return byKey
    }
  }
  return 0
}

export function resolvePreviewVersionIndex(
  versions: PostCreatorImageVersion[],
  postImageIndex: number,
  storedPreviewIndex?: number,
): number {
  if (
    storedPreviewIndex != null &&
    storedPreviewIndex >= 0 &&
    storedPreviewIndex < versions.length
  ) {
    return storedPreviewIndex
  }
  return postImageIndex
}

export function pageHasGeneratedImage(
  page: Pick<PostCreatorPage, 'imageUrl' | 'mediaS3Key' | 'imageVersions'> | undefined,
  versions: PostCreatorImageVersion[],
): boolean {
  if (versions.length > 0) {
    return true
  }
  if (page?.imageVersions && page.imageVersions.length > 0) {
    return true
  }
  if (page?.mediaS3Key) {
    return true
  }
  if (page?.imageUrl) {
    return true
  }
  return false
}

export type PostCreatorPreviewSource = 'version' | 'template'

export function resolvePreviewSourceForPage(
  page: Pick<PostCreatorPage, 'templateImage' | 'previewSource'> | undefined,
): PostCreatorPreviewSource {
  if (page?.previewSource === 'template' || page?.previewSource === 'version') {
    return page.previewSource
  }
  return page?.templateImage ? 'template' : 'version'
}
