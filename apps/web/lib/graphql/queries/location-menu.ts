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
  taxClass: string
  sortOrder: number
  isAvailable: boolean
  imageFilename: string | null
  dietaryTags: string[]
  allergens: string[]
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
  orderingEnabled: boolean
  allowDineIn: boolean
  allowPickup: boolean
  allowDelivery: boolean
  headerImageFilename: string | null
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
  taxClass
  sortOrder
  isAvailable
  imageFilename
  dietaryTags
  allergens
  modifierGroups {
    ${MENU_MODIFIER_FIELDS}
  }
`

const MENU_FIELDS = `
  id
  locationId
  title
  publicEnabled
  orderingEnabled
  allowDineIn
  allowPickup
  allowDelivery
  headerImageFilename
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
    $headerImageFilename: String
    $orderingEnabled: Boolean
    $allowDineIn: Boolean
    $allowPickup: Boolean
    $allowDelivery: Boolean
  ) {
    updateLocationPublicMenu(
      locationId: $locationId
      publicEnabled: $publicEnabled
      publicSlug: $publicSlug
      headerImageFilename: $headerImageFilename
      orderingEnabled: $orderingEnabled
      allowDineIn: $allowDineIn
      allowPickup: $allowPickup
      allowDelivery: $allowDelivery
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
      publicSlug
      currency
      workspaceId
      mediaOwnerClerkUserId
      headerImageFilename
      orderingEnabled
      allowDineIn
      allowPickup
      allowDelivery
      categories {
        name
        sortOrder
        items {
          id
          name
          price
          sortOrder
          description
          imageFilename
          dietaryTags
          allergens
          publishedFeedbackCount
          publishedFeedbacks {
            sentiment
            body
            guestDisplayName
            ownerReply
            createdAt
          }
        }
      }
    }
  }
`

export type PublicMenuItemFeedbackSnippet = {
  sentiment: 'POSITIVE' | 'NEGATIVE' | null
  body: string
  guestDisplayName: string | null
  ownerReply: string | null
  createdAt: string
}

export type PublicMenuItem = {
  id: number
  name: string
  price: number
  sortOrder: number
  description: string
  imageFilename: string | null
  dietaryTags: string[]
  allergens: string[]
  publishedFeedbackCount: number
  publishedFeedbacks: PublicMenuItemFeedbackSnippet[]
}

export type PublicMenuCategory = {
  name: string
  sortOrder: number
  items: PublicMenuItem[]
}

export type PublicLocationMenuPayload = {
  locationId: number
  name: string
  publicSlug: string
  currency: string | null
  workspaceId: string | null
  mediaOwnerClerkUserId: string | null
  headerImageFilename: string | null
  orderingEnabled: boolean
  allowDineIn: boolean
  allowPickup: boolean
  allowDelivery: boolean
  categories: PublicMenuCategory[]
}

export type PublicLocationMenuData = {
  publicLocationMenu: PublicLocationMenuPayload | null
}

export type PublicMenuFulfillmentMode = 'dine_in' | 'pickup' | 'delivery'

export const SUBMIT_PUBLIC_MENU_ORDER_MUTATION = `
  mutation SubmitPublicMenuOrder(
    $locationId: Int!
    $lines: [PublicMenuOrderLineInput!]!
    $fulfillmentMode: PosFulfillmentMode!
    $tableLabel: String
    $deliveryAddress: String
    $deliveryPhone: String
    $deliveryNotes: String
  ) {
    submitPublicMenuOrder(
      locationId: $locationId
      lines: $lines
      fulfillmentMode: $fulfillmentMode
      tableLabel: $tableLabel
      deliveryAddress: $deliveryAddress
      deliveryPhone: $deliveryPhone
      deliveryNotes: $deliveryNotes
    ) {
      id
      billNumber
      status
      note
      tableLabel
      fulfillmentMode
      prepStatus
      deliveryAddress
      deliveryPhone
      deliveryNotes
      openedByClerkUserId
      lines {
        menuItemId
        nameSnapshot
        qty
        unitPrice
        lineTotal
      }
    }
  }
`

export type SubmitPublicMenuOrderResult = {
  id: number
  billNumber: string
  status: string
  note: string | null
  tableLabel: string | null
  fulfillmentMode: 'DINE_IN' | 'PICKUP' | 'DELIVERY' | null
  prepStatus: 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED' | 'PICKED_UP' | 'DELIVERED' | null
  deliveryAddress: string | null
  deliveryPhone: string | null
  deliveryNotes: string | null
  openedByClerkUserId: string
  lines: Array<{
    menuItemId: number
    nameSnapshot: string
    qty: number
    unitPrice: number
    lineTotal: number
  }>
}

export type SubmitPublicMenuOrderData = {
  submitPublicMenuOrder: SubmitPublicMenuOrderResult
}

export const PUBLIC_MENU_ORDER_QUERY = `
  query PublicMenuOrder($orderId: Int!) {
    publicMenuOrder(orderId: $orderId) {
      id
      billNumber
      status
      prepStatus
      fulfillmentMode
      tableLabel
      deliveryAddress
      deliveryPhone
      deliveryNotes
      lines {
        menuItemId
        name
      }
    }
  }
`

export type PublicMenuOrderResult = {
  id: number
  billNumber: string
  status: string
  prepStatus: 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED' | 'PICKED_UP' | 'DELIVERED' | null
  fulfillmentMode: 'DINE_IN' | 'PICKUP' | 'DELIVERY' | null
  tableLabel: string | null
  deliveryAddress?: string | null
  deliveryPhone?: string | null
  deliveryNotes?: string | null
  lines?: Array<{ menuItemId: number; name: string }>
}

export type PublicMenuOrderData = {
  publicMenuOrder: PublicMenuOrderResult | null
}

export const MY_OPEN_PUBLIC_MENU_ORDER_QUERY = `
  query MyOpenPublicMenuOrder($locationId: Int!) {
    myOpenPublicMenuOrder(locationId: $locationId) {
      id
      billNumber
      status
      prepStatus
      fulfillmentMode
      tableLabel
      deliveryAddress
      deliveryPhone
      deliveryNotes
      lines {
        menuItemId
        name
      }
    }
  }
`

export type MyOpenPublicMenuOrderData = {
  myOpenPublicMenuOrder: PublicMenuOrderResult | null
}
