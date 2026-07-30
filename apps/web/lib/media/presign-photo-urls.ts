import { getPresignedGetUrl, isSafePhotoFilename } from '@/lib/assets/storage'
import {
  requireWorkspaceMediaAccess,
  resolveObjectKey,
  type WorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { ATTACHED_MEDIA_PRESIGN_MAX } from '@/lib/chat/hydrate-attached-media-urls'

/**
 * Resolve photo-library filenames to short-lived presigned GET URLs for the user's workspace.
 * Invalid / missing names are skipped (logged by caller if needed).
 */
export async function presignPhotoUrlsByName(
  userId: string,
  names: readonly string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(
    0,
    ATTACHED_MEDIA_PRESIGN_MAX,
  )
  if (unique.length === 0) return {}

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
  if (!mediaAccess.ok) return {}

  return presignPhotoUrlsForAccess(mediaAccess.access, unique)
}

export async function presignPhotoUrlsForAccess(
  access: WorkspaceMediaAccess,
  names: readonly string[],
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}
  await Promise.all(
    names.map(async (name) => {
      if (!isSafePhotoFilename(name)) return
      try {
        const key = await resolveObjectKey(access, 'photos', name)
        if (!key) return
        urls[name] = await getPresignedGetUrl(key)
      } catch (err) {
        console.error('[media/presign-photos] presign failed', {
          name,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )
  return urls
}
