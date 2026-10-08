import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_QUERY,
  type PublicLocation,
  type PublicLocationData,
} from '@/lib/graphql/queries/public-location'

export async function loadPublicLocation(slug: string): Promise<PublicLocation | null> {
  const cleaned = slug.trim().toLowerCase()
  if (!cleaned) return null
  const data = await graphqlQuery<PublicLocationData>(
    PUBLIC_LOCATION_QUERY,
    { slug: cleaned },
    undefined,
    'PublicLocation',
  )
  return data.publicLocation
}
