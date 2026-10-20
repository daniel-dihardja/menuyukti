import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATIONS_QUERY,
  type PublicLocationDirectoryItem,
  type PublicLocationsData,
} from '@/lib/graphql/queries/public-location'
import { presignPublicPhotos } from '@/lib/public-media/presign-public-photos'

export type PublicLocationDirectoryItemView = PublicLocationDirectoryItem & {
  headerImageUrl: string | null
}

export type PublicLocationsView = {
  cities: string[]
  locations: PublicLocationDirectoryItemView[]
}

export type LoadPublicLocationsParams = {
  city?: string | null
  query?: string | null
  /** When set, only that listing kind. Omit / null for all. */
  listingKind?: 'commercial' | 'community' | null
  /** When true, only venues with a live pickup offer. */
  hasPickupOffer?: boolean | null
  first?: number
}

async function presignDirectoryHeaders(
  locations: PublicLocationDirectoryItem[],
): Promise<PublicLocationDirectoryItemView[]> {
  const byOwnerKey = new Map<
    string,
    { workspaceId: string | null; mediaOwnerClerkUserId: string | null; filenames: string[] }
  >()

  for (const location of locations) {
    const filename = location.headerImageFilename?.trim() || null
    if (!filename) continue
    const key = `${location.workspaceId ?? ''}|${location.mediaOwnerClerkUserId ?? ''}`
    const existing = byOwnerKey.get(key)
    if (existing) {
      if (!existing.filenames.includes(filename)) existing.filenames.push(filename)
    } else {
      byOwnerKey.set(key, {
        workspaceId: location.workspaceId,
        mediaOwnerClerkUserId: location.mediaOwnerClerkUserId,
        filenames: [filename],
      })
    }
  }

  const urlByFilename = new Map<string, string>()
  await Promise.all(
    [...byOwnerKey.values()].map(async (group) => {
      const mapped = await presignPublicPhotos(
        group.workspaceId,
        group.mediaOwnerClerkUserId,
        group.filenames,
        'public-location-directory',
      )
      for (const [name, url] of Object.entries(mapped)) {
        if (url) urlByFilename.set(name, url)
      }
    }),
  )

  return locations.map((location) => {
    const filename = location.headerImageFilename?.trim() || null
    return {
      ...location,
      headerImageUrl: filename ? (urlByFilename.get(filename) ?? null) : null,
    }
  })
}

export async function loadPublicLocations(
  params: LoadPublicLocationsParams = {},
): Promise<PublicLocationsView> {
  const city = params.city?.trim() || null
  const query = params.query?.trim() || null
  const listingKind =
    params.listingKind === 'community' || params.listingKind === 'commercial'
      ? params.listingKind
      : null
  const hasPickupOffer = params.hasPickupOffer === true ? true : null
  const data = await graphqlQuery<PublicLocationsData>(
    PUBLIC_LOCATIONS_QUERY,
    {
      city,
      query,
      listingKind,
      hasPickupOffer,
      first: params.first ?? 48,
    },
    undefined,
    'PublicLocations',
  )
  const directory = data.publicLocations
  const locations = await presignDirectoryHeaders(directory.locations)
  return {
    cities: directory.cities,
    locations,
  }
}
