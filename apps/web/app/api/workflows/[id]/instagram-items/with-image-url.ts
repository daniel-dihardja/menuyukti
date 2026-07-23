import { getPresignedGetUrl, isObjectKeyForPost } from '@/lib/assets/storage'
import type {
  InstagramItemDto,
  InstagramItemPageDto,
  InstagramItemPageMediaVersionDto,
} from '@/lib/graphql/queries/instagram-items'

async function withVersionImageUrls(
  versions: InstagramItemPageMediaVersionDto[] | undefined,
  userId?: string,
): Promise<InstagramItemPageMediaVersionDto[]> {
  if (!Array.isArray(versions) || versions.length === 0) {
    return []
  }

  return Promise.all(
    versions.map(async (version) => {
      if (userId && !isObjectKeyForPost(version.mediaS3Key, userId)) {
        return { ...version, imageUrl: null as string | null }
      }
      try {
        const imageUrl = await getPresignedGetUrl(version.mediaS3Key)
        return { ...version, imageUrl }
      } catch (err) {
        console.error('[instagram-items] failed to presign media version', {
          mediaS3Key: version.mediaS3Key,
          message: err instanceof Error ? err.message : String(err),
        })
        return { ...version, imageUrl: null as string | null }
      }
    }),
  )
}

export async function withPageImageUrl(
  page: InstagramItemPageDto,
  userId?: string,
): Promise<InstagramItemPageDto> {
  const mediaVersions = await withVersionImageUrls(page.mediaVersions, userId)

  if (!page.mediaS3Key) {
    return { ...page, mediaVersions, imageUrl: null }
  }

  if (userId && !isObjectKeyForPost(page.mediaS3Key, userId)) {
    return { ...page, mediaVersions, imageUrl: null }
  }

  try {
    const imageUrl = await getPresignedGetUrl(page.mediaS3Key)
    return { ...page, mediaVersions, imageUrl }
  } catch (err) {
    console.error('[instagram-items] failed to presign page media', {
      pageId: page.id,
      message: err instanceof Error ? err.message : String(err),
    })
    return { ...page, mediaVersions, imageUrl: null }
  }
}

export async function withItemImageUrl(
  item: InstagramItemDto,
  userId?: string,
): Promise<InstagramItemDto & { imageUrl: string | null }> {
  const pages = await Promise.all((item.pages ?? []).map((page) => withPageImageUrl(page, userId)))
  const cover = pages.toSorted((a, b) => a.sortOrder - b.sortOrder)[0]
  return {
    ...item,
    pages,
    imageUrl: cover?.imageUrl ?? null,
  }
}

export async function withItemImageUrls(
  items: InstagramItemDto[],
  userId?: string,
): Promise<Array<InstagramItemDto & { imageUrl: string | null }>> {
  return Promise.all(items.map((item) => withItemImageUrl(item, userId)))
}
