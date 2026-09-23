import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_MENU_QUERY,
  type PublicLocationMenuData,
  type PublicLocationMenuPayload,
} from '@/lib/graphql/queries/location-menu'

/** Load published public menu by slug, or null when missing/disabled. */
export async function loadPublicLocationMenu(
  rawSlug: string,
): Promise<PublicLocationMenuPayload | null> {
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) return null

  const data = await graphqlQuery<PublicLocationMenuData>(
    PUBLIC_LOCATION_MENU_QUERY,
    { slug },
    undefined,
  )
  return data.publicLocationMenu
}
