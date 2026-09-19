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

export const LOCATION_MENU_QUERY = `
  query LocationMenu($locationId: Int!) {
    locationMenu(locationId: $locationId) {
      id
      locationId
      title
      categories {
        id
        menuId
        name
        sortOrder
        items {
          ${MENU_ITEM_FIELDS}
        }
      }
    }
  }
`

export type LocationMenuData = {
  locationMenu: LocationMenu | null
}

export const REPLACE_LOCATION_MENU_ITEMS_MUTATION = `
  mutation ReplaceLocationMenuItems($locationId: Int!, $categories: [MenuCategoryInput!]!) {
    replaceLocationMenuItems(locationId: $locationId, categories: $categories) {
      id
      locationId
      title
      categories {
        id
        menuId
        name
        sortOrder
        items {
          ${MENU_ITEM_FIELDS}
        }
      }
    }
  }
`

export type ReplaceLocationMenuItemsData = {
  replaceLocationMenuItems: LocationMenu
}
