import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_WALL_QUERY,
  type PublicLocationWallData,
  type PublicWallTile,
} from '@/lib/graphql/queries'
import { presignPublicPhotos } from '@/lib/public-media/presign-public-photos'

export type PublicWallTileView = PublicWallTile & {
  imageUrl: string | null
}

export type PublicLocationWallView = {
  name: string
  tagline: string | null
  publicSlug: string
  tiles: PublicWallTileView[]
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
  const urlByName = await presignPublicPhotos(
    wall.workspaceId,
    wall.mediaOwnerClerkUserId,
    [...allowedNames],
    'public-wall',
  )

  return {
    name: wall.name,
    tagline: wall.tagline,
    publicSlug: wall.publicSlug,
    tiles: wall.tiles.map((tile) => {
      const filename = tile.imageFilename?.trim() || null
      const imageUrl = filename && allowedNames.has(filename) ? (urlByName[filename] ?? null) : null
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
