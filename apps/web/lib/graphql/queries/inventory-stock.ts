import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'

export type InventoryStockRow = {
  id: number
  locationId: number
  catalogItemId: number
  onHand: number
  catalogItem: Pick<
    InventoryCatalogItem,
    'id' | 'name' | 'packageSize' | 'packageUnit' | 'storageZone'
  >
  createdAt: string
  updatedAt: string
}

const STOCK_FIELDS = `
  id
  locationId
  catalogItemId
  onHand
  createdAt
  updatedAt
  catalogItem {
    id
    name
    packageSize
    packageUnit
    storageZone
  }
`

export const INVENTORY_STOCK_QUERY = `
  query InventoryStock($locationId: ID!) {
    inventoryStock(locationId: $locationId) {
      ${STOCK_FIELDS}
    }
  }
`

export type InventoryStockData = {
  inventoryStock: InventoryStockRow[]
}

export const CREATE_INVENTORY_CATALOG_ITEM_WITH_STOCK_MUTATION = `
  mutation CreateInventoryCatalogItemWithStock(
    $locationId: Int!
    $name: String!
    $packageSize: Float!
    $packageUnit: String!
    $onHand: Float!
    $storageZone: InventoryStorageZone
  ) {
    createInventoryCatalogItemWithStock(
      locationId: $locationId
      name: $name
      packageSize: $packageSize
      packageUnit: $packageUnit
      onHand: $onHand
      storageZone: $storageZone
    ) {
      ${STOCK_FIELDS}
    }
  }
`

export type CreateInventoryCatalogItemWithStockData = {
  createInventoryCatalogItemWithStock: InventoryStockRow
}

export const UPSERT_INVENTORY_STOCK_MUTATION = `
  mutation UpsertInventoryStock(
    $locationId: Int!
    $catalogItemId: Int!
    $onHand: Float!
  ) {
    upsertInventoryStock(
      locationId: $locationId
      catalogItemId: $catalogItemId
      onHand: $onHand
    ) {
      ${STOCK_FIELDS}
    }
  }
`

export type UpsertInventoryStockData = {
  upsertInventoryStock: InventoryStockRow
}

export const TRANSFER_INVENTORY_STOCK_MUTATION = `
  mutation TransferInventoryStock(
    $fromStockId: Int!
    $toLocationId: Int!
    $quantity: Float!
  ) {
    transferInventoryStock(
      fromStockId: $fromStockId
      toLocationId: $toLocationId
      quantity: $quantity
    ) {
      fromLocationId
      toLocationId
      fromStock {
        ${STOCK_FIELDS}
      }
      toStock {
        ${STOCK_FIELDS}
      }
    }
  }
`

export type InventoryStockTransferResult = {
  fromLocationId: number
  toLocationId: number
  fromStock: InventoryStockRow | null
  toStock: InventoryStockRow
}

export type TransferInventoryStockData = {
  transferInventoryStock: InventoryStockTransferResult
}

export const DELETE_INVENTORY_STOCK_MUTATION = `
  mutation DeleteInventoryStock($id: Int!) {
    deleteInventoryStock(id: $id)
  }
`

export type DeleteInventoryStockData = {
  deleteInventoryStock: boolean
}
