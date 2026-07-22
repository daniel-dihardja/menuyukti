import { getPresignedGetUrl } from '@/lib/assets/storage'
import type { InstagramItemDto } from '@/lib/graphql/queries/instagram-items'

export async function withItemImageUrl(
  item: InstagramItemDto,
): Promise<InstagramItemDto & { imageUrl: string | null }> {
  if (!item.mediaS3Key) {
    return { ...item, imageUrl: null }
  }
  try {
    const imageUrl = await getPresignedGetUrl(item.mediaS3Key)
    return { ...item, imageUrl }
  } catch (err) {
    console.error('[instagram-items] failed to presign media', {
      itemId: item.id,
      message: err instanceof Error ? err.message : String(err),
    })
    return { ...item, imageUrl: null }
  }
}

export async function withItemImageUrls(
  items: InstagramItemDto[],
): Promise<Array<InstagramItemDto & { imageUrl: string | null }>> {
  return Promise.all(items.map((item) => withItemImageUrl(item)))
}
