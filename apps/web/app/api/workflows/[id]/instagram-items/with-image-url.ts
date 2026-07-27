import { copyPostMediaKeyToWorkspace, getPresignedGetUrl } from '@/lib/assets/storage'
import {
  isLegacyOwnerPostKey,
  isPostKeyAllowedForAccess,
  type WorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import type {
  InstagramItemDto,
  InstagramItemPageDto,
  InstagramItemPageMediaVersionDto,
} from '@/lib/graphql/queries/instagram-items'

async function ensureAndPresignPostKey(
  key: string,
  access?: WorkspaceMediaAccess,
): Promise<{ imageUrl: string | null; mediaS3Key: string }> {
  if (access && !isPostKeyAllowedForAccess(access, key)) {
    return { imageUrl: null, mediaS3Key: key }
  }

  let effectiveKey = key
  if (access && isLegacyOwnerPostKey(access, key)) {
    try {
      effectiveKey = await copyPostMediaKeyToWorkspace(key, access.workspaceId)
    } catch (err) {
      console.error('[instagram-items] failed to migrate legacy media key', {
        mediaS3Key: key,
        message: err instanceof Error ? err.message : String(err),
      })
      effectiveKey = key
    }
  }

  try {
    const imageUrl = await getPresignedGetUrl(effectiveKey)
    return { imageUrl, mediaS3Key: effectiveKey }
  } catch (err) {
    console.error('[instagram-items] failed to presign media', {
      mediaS3Key: effectiveKey,
      message: err instanceof Error ? err.message : String(err),
    })
    return { imageUrl: null, mediaS3Key: effectiveKey }
  }
}

async function withVersionImageUrls(
  versions: InstagramItemPageMediaVersionDto[] | undefined,
  access?: WorkspaceMediaAccess,
): Promise<InstagramItemPageMediaVersionDto[]> {
  if (!Array.isArray(versions) || versions.length === 0) {
    return []
  }

  return Promise.all(
    versions.map(async (version) => {
      const { imageUrl, mediaS3Key } = await ensureAndPresignPostKey(version.mediaS3Key, access)
      return { ...version, mediaS3Key, imageUrl }
    }),
  )
}

export async function withPageImageUrl(
  page: InstagramItemPageDto,
  access?: WorkspaceMediaAccess,
): Promise<InstagramItemPageDto> {
  const mediaVersions = await withVersionImageUrls(page.mediaVersions, access)

  if (!page.mediaS3Key) {
    return { ...page, mediaVersions, imageUrl: null }
  }

  const { imageUrl, mediaS3Key } = await ensureAndPresignPostKey(page.mediaS3Key, access)
  return { ...page, mediaS3Key, mediaVersions, imageUrl }
}

export async function withItemImageUrl(
  item: InstagramItemDto,
  access?: WorkspaceMediaAccess,
): Promise<InstagramItemDto & { imageUrl: string | null }> {
  const pages = await Promise.all((item.pages ?? []).map((page) => withPageImageUrl(page, access)))
  const cover = pages.toSorted((a, b) => a.sortOrder - b.sortOrder)[0]
  return {
    ...item,
    pages,
    imageUrl: cover?.imageUrl ?? null,
  }
}

export async function withItemImageUrls(
  items: InstagramItemDto[],
  access?: WorkspaceMediaAccess,
): Promise<Array<InstagramItemDto & { imageUrl: string | null }>> {
  return Promise.all(items.map((item) => withItemImageUrl(item, access)))
}

/** Persist migrated workspace keys for pages whose mediaS3Key changed (best-effort). */
export async function persistMigratedPageMediaKeys(
  originalPages: InstagramItemPageDto[] | undefined,
  migratedPages: InstagramItemPageDto[],
  updatePage: (pageId: string, mediaS3Key: string) => Promise<void>,
): Promise<void> {
  const originalById = new Map((originalPages ?? []).map((page) => [page.id, page.mediaS3Key]))
  await Promise.all(
    migratedPages.map(async (page) => {
      const previous = originalById.get(page.id)
      if (!page.mediaS3Key || page.mediaS3Key === previous) return
      try {
        await updatePage(page.id, page.mediaS3Key)
      } catch (err) {
        console.error('[instagram-items] failed to persist migrated media key', {
          pageId: page.id,
          mediaS3Key: page.mediaS3Key,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )
}
