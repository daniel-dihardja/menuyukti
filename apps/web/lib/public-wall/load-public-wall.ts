import {
  getPresignedGetUrl,
  isSafePhotoFilename,
  userPhotosObjectKey,
  workspacePhotosObjectKey,
} from '@/lib/assets/storage'
import {
  resolveObjectKey,
  type WorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_WALL_QUERY,
  type PublicLocationWallData,
  type PublicWallTile,
} from '@/lib/graphql/queries'

export type PublicWallTileView = PublicWallTile & {
  imageUrl: string | null
}

export type PublicLocationWallView = {
  name: string
  tagline: string | null
  publicSlug: string
  tiles: PublicWallTileView[]
}

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

async function presignTileImages(
  workspaceId: string | null,
  mediaOwnerClerkUserId: string | null,
  filenames: string[],
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
        console.error('[public-wall] presign failed', {
          name,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )
  return urls
}

/** Load curated public wall by slug, or null when missing/disabled. */
export async function loadPublicLocationWall(
  rawSlug: string,
): Promise<PublicLocationWallView | null> {
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) return null

  const data = await graphqlQuery<PublicLocationWallData>(
    PUBLIC_LOCATION_WALL_QUERY,
    { slug },
    undefined,
  )
  const wall = data.publicLocationWall
  if (!wall) return null

  const allowedNames = new Set(
    wall.tiles
      .map((tile) => tile.imageFilename?.trim())
      .filter((name): name is string => Boolean(name)),
  )
  const urlByName = await presignTileImages(
    wall.workspaceId,
    wall.mediaOwnerClerkUserId,
    [...allowedNames],
  )

  return {
    name: wall.name,
    tagline: wall.tagline,
    publicSlug: wall.publicSlug,
    tiles: wall.tiles.map((tile) => {
      const filename = tile.imageFilename?.trim() || null
      const imageUrl =
        filename && allowedNames.has(filename) ? (urlByName[filename] ?? null) : null
      return {
        kind: tile.kind,
        key: tile.key,
        title: tile.title,
        description: tile.description,
        imageFilename: filename,
        imageUrl,
      }
    }),
  }
}
