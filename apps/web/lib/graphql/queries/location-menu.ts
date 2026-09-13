export type LocationMenuItem = {
  id: number
  menuId: number
  name: string
  description: string
  price: number
  sortOrder: number
  isAvailable: boolean
  imageFilename: string | null
}

export type LocationMenu = {
  id: number
  locationId: number
  title: string
  items: LocationMenuItem[]
}

export const LOCATION_MENU_QUERY = `
  query LocationMenu($locationId: Int!) {
    locationMenu(locationId: $locationId) {
      id
      locationId
      title
      items {
        id
        menuId
        name
        description
        price
        sortOrder
        isAvailable
        imageFilename
      }
    }
  }
`

export type LocationMenuData = {
  locationMenu: LocationMenu | null
}

export const REPLACE_LOCATION_MENU_ITEMS_MUTATION = `
  mutation ReplaceLocationMenuItems($locationId: Int!, $items: [MenuItemInput!]!) {
    replaceLocationMenuItems(locationId: $locationId, items: $items) {
      id
      locationId
      title
      items {
        id
        menuId
        name
        description
        price
        sortOrder
        isAvailable
        imageFilename
      }
    }
  }
`

export type ReplaceLocationMenuItemsData = {
  replaceLocationMenuItems: LocationMenu
}
