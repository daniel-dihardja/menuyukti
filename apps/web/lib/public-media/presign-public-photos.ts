import {
  getPresignedGetUrl,
  isSafePhotoFilename,
  userPhotosObjectKey,
  workspacePhotosObjectKey,
} from '@/lib/assets/storage'
import { resolveObjectKey, type WorkspaceMediaAccess } from '@/lib/assets/workspace-media-access'

async function objectKeyForPublicPhoto(
  workspaceId: string | null,
  mediaOwnerClerkUserId: string | null,
  filename: string,
): Promise<string | null> {
  if (!isSafePhotoFilename(filename)) return null

  if (workspaceId && mediaOwnerClerkUserId) {
    const access: WorkspaceMediaAccess = {
      workspaceId,
      ownerClerkUserId: mediaOwnerClerkUserId,
      role: 'member',
      canRead: true,
      canWrite: true,
      canDelete: true,
    }
    return resolveObjectKey(access, 'photos', filename)
  }

  if (workspaceId) {
    return workspacePhotosObjectKey(workspaceId, filename)
  }

  if (mediaOwnerClerkUserId) {
    return userPhotosObjectKey(mediaOwnerClerkUserId, filename)
  }

  return null
}

/** Presign allowlisted photo-library filenames for unauthenticated public surfaces. */
export async function presignPublicPhotos(
  workspaceId: string | null,
  mediaOwnerClerkUserId: string | null,
  filenames: string[],
  logLabel = 'public-media',
): Promise<Record<string, string>> {
  if (filenames.length === 0) return {}
  if (!workspaceId && !mediaOwnerClerkUserId) return {}

  const urls: Record<string, string> = {}
  await Promise.all(
    filenames.map(async (name) => {
      try {
        const key = await objectKeyForPublicPhoto(workspaceId, mediaOwnerClerkUserId, name)
        if (!key) return
        urls[name] = await getPresignedGetUrl(key)
      } catch (err) {
        console.error(`[${logLabel}] presign failed`, {
          name,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )
  return urls
}
