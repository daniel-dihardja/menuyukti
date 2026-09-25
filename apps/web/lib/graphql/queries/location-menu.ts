export type LocationMenuModifierOption = {
  id: number
  groupId: number
  name: string
  priceDelta: number
  isAvailable: boolean
  sortOrder: number
}

export type LocationMenuModifierGroup = {
  id: number
  menuItemId: number
  name: string
  minSelect: number
  maxSelect: number
  sortOrder: number
  options: LocationMenuModifierOption[]
}

export type LocationMenuItem = {
  id: number
  menuId: number
  categoryId: number
  name: string
  description: string
  price: number
  sortOrder: number
  isAvailable: boolean
  imageFilename: string | null
  modifierGroups: LocationMenuModifierGroup[]
}

export type LocationMenuCategory = {
  id: number
  menuId: number
  name: string
  sortOrder: number
  items: LocationMenuItem[]
}

export type LocationMenu = {
  id: number
  locationId: number
  title: string
  publicEnabled: boolean
  categories: LocationMenuCategory[]
}

const MENU_MODIFIER_FIELDS = `
  id
  menuItemId
  name
  minSelect
  maxSelect
  sortOrder
  options {
    id
    groupId
    name
    priceDelta
    isAvailable
    sortOrder
  }
`

const MENU_ITEM_FIELDS = `
  id
  menuId
  categoryId
  name
  description
  price
  sortOrder
  isAvailable
  imageFilename
  modifierGroups {
    ${MENU_MODIFIER_FIELDS}
  }
`

const MENU_FIELDS = `
  id
  locationId
  title
  publicEnabled
  categories {
    id
    menuId
    name
    sortOrder
    items {
      ${MENU_ITEM_FIELDS}
    }
  }
`

export const LOCATION_MENU_QUERY = `
  query LocationMenu($locationId: Int!) {
    locationMenu(locationId: $locationId) {
      ${MENU_FIELDS}
    }
  }
`

export type LocationMenuData = {
  locationMenu: LocationMenu | null
}

export const REPLACE_LOCATION_MENU_ITEMS_MUTATION = `
  mutation ReplaceLocationMenuItems($locationId: Int!, $categories: [MenuCategoryInput!]!) {
    replaceLocationMenuItems(locationId: $locationId, categories: $categories) {
      ${MENU_FIELDS}
    }
  }
`

export type ReplaceLocationMenuItemsData = {
  replaceLocationMenuItems: LocationMenu
}

export const UPDATE_LOCATION_PUBLIC_MENU_MUTATION = `
  mutation UpdateLocationPublicMenu(
    $locationId: Int!
    $publicEnabled: Boolean
    $publicSlug: String
  ) {
    updateLocationPublicMenu(
      locationId: $locationId
      publicEnabled: $publicEnabled
      publicSlug: $publicSlug
    ) {
      locationId
      publicEnabled
      publicSlug
      menu {
        ${MENU_FIELDS}
      }
    }
  }
`

export type UpdateLocationPublicMenuPayload = {
  locationId: number
  publicEnabled: boolean
  publicSlug: string | null
  menu: LocationMenu
}

export type UpdateLocationPublicMenuData = {
  updateLocationPublicMenu: UpdateLocationPublicMenuPayload
}

export const PUBLIC_LOCATION_MENU_QUERY = `
  query PublicLocationMenu($slug: String!) {
    publicLocationMenu(slug: $slug) {
      locationId
      name
      tagline
      publicSlug
      currency
      workspaceId
      mediaOwnerClerkUserId
      categories {
        name
        sortOrder
        items {
          name
          price
          sortOrder
          description
          imageFilename
        }
      }
    }
  }
`

export type PublicMenuItem = {
  name: string
  price: number
  sortOrder: number
  description: string
  imageFilename: string | null
}

export type PublicMenuCategory = {
  name: string
  sortOrder: number
  items: PublicMenuItem[]
}

export type PublicLocationMenuPayload = {
  locationId: number
  name: string
  tagline: string | null
  publicSlug: string
  currency: string | null
  workspaceId: string | null
  mediaOwnerClerkUserId: string | null
  categories: PublicMenuCategory[]
}

export type PublicLocationMenuData = {
  publicLocationMenu: PublicLocationMenuPayload | null
}
