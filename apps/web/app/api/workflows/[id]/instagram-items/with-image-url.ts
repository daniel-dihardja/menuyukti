import { getPresignedGetUrl, isObjectKeyForPost } from '@/lib/assets/storage'
import type {
  InstagramItemDto,
  InstagramItemMediaVersionDto,
} from '@/lib/graphql/queries/instagram-items'

async function withVersionImageUrls(
  versions: InstagramItemMediaVersionDto[] | undefined,
  userId?: string,
): Promise<InstagramItemMediaVersionDto[]> {
  if (!Array.isArray(versions) || versions.length === 0) {
    return []
  }

  const mapped = await Promise.all(
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
  return mapped
}

export async function withItemImageUrl(
  item: InstagramItemDto,
  userId?: string,
): Promise<InstagramItemDto & { imageUrl: string | null }> {
  const mediaVersions = await withVersionImageUrls(item.mediaVersions, userId)

  if (!item.mediaS3Key) {
    return { ...item, mediaVersions, imageUrl: null }
  }

  if (userId && !isObjectKeyForPost(item.mediaS3Key, userId)) {
    return { ...item, mediaVersions, imageUrl: null }
  }

  try {
    const imageUrl = await getPresignedGetUrl(item.mediaS3Key)
    return { ...item, mediaVersions, imageUrl }
  } catch (err) {
    console.error('[instagram-items] failed to presign media', {
      itemId: item.id,
      message: err instanceof Error ? err.message : String(err),
    })
    return { ...item, mediaVersions, imageUrl: null }
  }
}

export async function withItemImageUrls(
  items: InstagramItemDto[],
  userId?: string,
): Promise<Array<InstagramItemDto & { imageUrl: string | null }>> {
  return Promise.all(items.map((item) => withItemImageUrl(item, userId)))
}
