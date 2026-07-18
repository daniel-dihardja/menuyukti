import type { OutputDimensions } from '@/lib/posts/build-instagram-post-prompt'
import {
  DEFAULT_POST_IMAGE_FORMAT,
  DEFAULT_POST_IMAGE_QUALITY,
  resolveLeonardoOutputDimensions,
  type PostImageFormatId,
  type PostImageQualityId,
} from '@/lib/posts/leonardo-post-dimensions'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'

import type { PostCreatorImageVersion, PostCreatorPage } from './post-creator-types'

/**
 * Resolve Leonardo output size from format + quality.
 * Match-layout uses template dims snapped to a valid model pair.
 * Explicit format always owns the canvas (previous-result is reference-only).
 */
export function resolveGenerationOutputDimensions(input: {
  model?: LeonardoPostModelId
  format?: PostImageFormatId
  quality?: PostImageQualityId
  templateDimensions?: OutputDimensions
}): OutputDimensions {
  return resolveLeonardoOutputDimensions({
    model: input.model ?? DEFAULT_LEONARDO_POST_MODEL,
    format: input.format ?? DEFAULT_POST_IMAGE_FORMAT,
    quality: input.quality ?? DEFAULT_POST_IMAGE_QUALITY,
    templateDimensions: input.templateDimensions,
  })
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
