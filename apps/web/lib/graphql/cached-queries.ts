import { unstable_cache } from 'next/cache'

import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATIONS_QUERY, type LocationsData } from '@/lib/graphql/queries'

/** Cached per user; reduces duplicate GraphQL hits on analytics entry routes. */
export function getCachedLocationsData(userId: string) {
  return unstable_cache(
    () => graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId),
    [`graphql-locations-data-${userId}`],
    { revalidate: 60, tags: [`graphql-locations-data-${userId}`] },
  )()
}
