import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_QUERY,
  type PublicLocation,
  type PublicLocationData,
} from '@/lib/graphql/queries/public-location'
import { presignPublicPhotos } from '@/lib/public-media/presign-public-photos'

export type PublicLocationView = PublicLocation & {
  headerImageUrl: string | null
}

export async function loadPublicLocation(slug: string): Promise<PublicLocationView | null> {
  const cleaned = slug.trim().toLowerCase()
  if (!cleaned) return null
  const data = await graphqlQuery<PublicLocationData>(
    PUBLIC_LOCATION_QUERY,
    { slug: cleaned },
    undefined,
    'PublicLocation',
  )
  const location = data.publicLocation
  if (!location) return null

  const headerFilename = location.headerImageFilename?.trim() || null
  let headerImageUrl: string | null = null
  if (headerFilename) {
    const urlByName = await presignPublicPhotos(
      location.workspaceId,
      location.mediaOwnerClerkUserId,
      [headerFilename],
      'public-location-hub',
    )
    headerImageUrl = urlByName[headerFilename] ?? null
  }

  return {
    ...location,
    headerImageUrl,
  }
}
