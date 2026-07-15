import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

import type { PostCreatorImageVersion, PostCreatorPage } from './post-creator-types'

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

export function resolveUsePreviousResultForPage(
  page: Pick<PostCreatorPage, 'templateImage' | 'usePreviousResult' | 'mediaS3Key'> | undefined,
  previewMediaS3Key: string | null,
): boolean {
  if (page?.templateImage) {
    return false
  }
  return page?.usePreviousResult ?? Boolean(parsePostMediaFilename(previewMediaS3Key))
}
