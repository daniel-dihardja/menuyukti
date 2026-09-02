import type { InventoryStorageZone } from '@/lib/inventar/storage-zones'

export type { InventoryStorageZone }

export type InventoryCatalogItem = {
  id: number
  workspaceId: number
  name: string
  packageSize: number
  packageUnit: string
  price: number | null
  minOnHand: number | null
  maxOnHand: number | null
  storageZone: InventoryStorageZone
  createdAt: string
  updatedAt: string
}

const CATALOG_FIELDS = `
  id
  workspaceId
  name
  packageSize
  packageUnit
  price
  minOnHand
  maxOnHand
  storageZone
  createdAt
  updatedAt
`

export const INVENTORY_CATALOG_ITEMS_QUERY = `
  query InventoryCatalogItems($workspaceId: ID!) {
    inventoryCatalogItems(workspaceId: $workspaceId) {
      ${CATALOG_FIELDS}
    }
  }
`

export type InventoryCatalogItemsData = {
  inventoryCatalogItems: InventoryCatalogItem[]
}

export const CREATE_INVENTORY_CATALOG_ITEM_MUTATION = `
  mutation CreateInventoryCatalogItem(
    $workspaceId: Int!
    $name: String!
    $packageSize: Float!
    $packageUnit: String!
    $storageZone: InventoryStorageZone
    $price: Float
    $minOnHand: Float
    $maxOnHand: Float
  ) {
    createInventoryCatalogItem(
      workspaceId: $workspaceId
      name: $name
      packageSize: $packageSize
      packageUnit: $packageUnit
      storageZone: $storageZone
      price: $price
      minOnHand: $minOnHand
      maxOnHand: $maxOnHand
    ) {
      ${CATALOG_FIELDS}
    }
  }
`

export type CreateInventoryCatalogItemData = {
  createInventoryCatalogItem: InventoryCatalogItem
}

export const UPDATE_INVENTORY_CATALOG_ITEM_MUTATION = `
  mutation UpdateInventoryCatalogItem(
    $id: Int!
    $name: String
    $packageSize: Float
    $packageUnit: String
    $storageZone: InventoryStorageZone
    $price: Float
    $minOnHand: Float
    $maxOnHand: Float
  ) {
    updateInventoryCatalogItem(
      id: $id
      name: $name
      packageSize: $packageSize
      packageUnit: $packageUnit
      storageZone: $storageZone
      price: $price
      minOnHand: $minOnHand
      maxOnHand: $maxOnHand
    ) {
      ${CATALOG_FIELDS}
    }
  }
`

export type UpdateInventoryCatalogItemData = {
  updateInventoryCatalogItem: InventoryCatalogItem
}

export const DELETE_INVENTORY_CATALOG_ITEM_MUTATION = `
  mutation DeleteInventoryCatalogItem($id: Int!) {
    deleteInventoryCatalogItem(id: $id)
  }
`

export type DeleteInventoryCatalogItemData = {
  deleteInventoryCatalogItem: boolean
}
