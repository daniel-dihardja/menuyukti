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
          id
          menuId
          categoryId
          name
          description
          price
          sortOrder
          isAvailable
          imageFilename
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
          id
          menuId
          categoryId
          name
          description
          price
          sortOrder
          isAvailable
          imageFilename
        }
      }
    }
  }
`

export type ReplaceLocationMenuItemsData = {
  replaceLocationMenuItems: LocationMenu
}
