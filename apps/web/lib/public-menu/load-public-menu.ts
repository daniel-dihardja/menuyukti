import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_MENU_QUERY,
  type PublicLocationMenuData,
  type PublicMenuCategory,
  type PublicMenuItem,
} from '@/lib/graphql/queries/location-menu'
import { presignPublicPhotos } from '@/lib/public-media/presign-public-photos'

export type PublicMenuItemView = PublicMenuItem & {
  imageUrl: string | null
}

export type PublicMenuCategoryView = Omit<PublicMenuCategory, 'items'> & {
  items: PublicMenuItemView[]
}

export type PublicLocationMenuView = {
  locationId: number
  name: string
  tagline: string | null
  publicSlug: string
  currency: string | null
  headerImageUrl: string | null
  categories: PublicMenuCategoryView[]
}

/** Load published public menu by slug, or null when missing/disabled. */
export async function loadPublicLocationMenu(
  rawSlug: string,
): Promise<PublicLocationMenuView | null> {
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) return null

  const data = await graphqlQuery<PublicLocationMenuData>(
    PUBLIC_LOCATION_MENU_QUERY,
    { slug },
    undefined,
  )
  const menu = data.publicLocationMenu
  if (!menu) return null

  const headerFilename = menu.headerImageFilename?.trim() || null
  const itemFilenames = menu.categories
    .flatMap((category) => category.items)
    .map((item) => item.imageFilename?.trim())
    .filter((name): name is string => Boolean(name))
  const allowedNames = new Set([
    ...itemFilenames,
    ...(headerFilename ? [headerFilename] : []),
  ])
  const urlByName = await presignPublicPhotos(
    menu.workspaceId,
    menu.mediaOwnerClerkUserId,
    [...allowedNames],
    'public-menu',
  )

  return {
    locationId: menu.locationId,
    name: menu.name,
    tagline: menu.tagline,
    publicSlug: menu.publicSlug,
    currency: menu.currency,
    headerImageUrl:
      headerFilename && allowedNames.has(headerFilename)
        ? (urlByName[headerFilename] ?? null)
        : null,
    categories: menu.categories.map((category) => ({
      name: category.name,
      sortOrder: category.sortOrder,
      items: category.items.map((item) => {
        const filename = item.imageFilename?.trim() || null
        const imageUrl =
          filename && allowedNames.has(filename) ? (urlByName[filename] ?? null) : null
        return {
          name: item.name,
          price: item.price,
          sortOrder: item.sortOrder,
          description: item.description,
          imageFilename: filename,
          imageUrl,
        }
      }),
    })),
  }
}
