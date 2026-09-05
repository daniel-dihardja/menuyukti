import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'

export type InventoryStockMovementDirection = 'in' | 'out' | 'transfer_in' | 'transfer_out'

export type InventoryActor = {
  clerkUserId: string
  name: string | null
  imageUrl: string | null
}

export type InventoryStockMovement = {
  id: number
  locationId: number
  catalogItemId: number
  stockId: number | null
  direction: InventoryStockMovementDirection
  quantity: number
  occurredOn: string
  note: string | null
  relatedMovementId: number | null
  relatedLocationId: number | null
  createdByClerkUserId: string | null
  createdAt: string
  createdBy?: InventoryActor | null
}

export type InventoryStockRow = {
  id: number
  locationId: number
  catalogItemId: number
  onHand: number
  lastInOn: string | null
  lastOutOn: string | null
  lastUpdatedByClerkUserId: string | null
  catalogItem: Pick<
    InventoryCatalogItem,
    | 'id'
    | 'name'
    | 'packageSize'
    | 'packageUnit'
    | 'storageZone'
    | 'price'
    | 'minOnHand'
    | 'maxOnHand'
  >
  createdAt: string
  updatedAt: string
  updatedBy?: InventoryActor | null
}

const STOCK_FIELDS = `
  id
  locationId
  catalogItemId
  onHand
  lastInOn
  lastOutOn
  lastUpdatedByClerkUserId
  createdAt
  updatedAt
  catalogItem {
    id
    name
    packageSize
    packageUnit
    storageZone
    price
    minOnHand
    maxOnHand
  }
`

const MOVEMENT_FIELDS = `
  id
  locationId
  catalogItemId
  stockId
  direction
  quantity
  occurredOn
  note
  relatedMovementId
  relatedLocationId
  createdByClerkUserId
  createdAt
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

export const INVENTORY_STOCK_MOVEMENTS_QUERY = `
  query InventoryStockMovements(
    $locationId: ID!
    $catalogItemId: ID!
    $stockId: ID
    $fromDate: Date
    $toDate: Date
    $limit: Int
  ) {
    inventoryStockMovements(
      locationId: $locationId
      catalogItemId: $catalogItemId
      stockId: $stockId
      fromDate: $fromDate
      toDate: $toDate
      limit: $limit
    ) {
      ${MOVEMENT_FIELDS}
    }
  }
`

export type InventoryStockMovementsData = {
  inventoryStockMovements: InventoryStockMovement[]
}

export const CREATE_INVENTORY_CATALOG_ITEM_WITH_STOCK_MUTATION = `
  mutation CreateInventoryCatalogItemWithStock(
    $locationId: Int!
    $name: String!
    $packageSize: Float!
    $packageUnit: String!
    $onHand: Float!
    $storageZone: InventoryStorageZone
    $price: Float
    $minOnHand: Float
    $maxOnHand: Float
  ) {
    createInventoryCatalogItemWithStock(
      locationId: $locationId
      name: $name
      packageSize: $packageSize
      packageUnit: $packageUnit
      onHand: $onHand
      storageZone: $storageZone
      price: $price
      minOnHand: $minOnHand
      maxOnHand: $maxOnHand
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

export const RECEIVE_INVENTORY_STOCK_MUTATION = `
  mutation ReceiveInventoryStock(
    $locationId: Int!
    $catalogItemId: Int!
    $quantity: Float!
    $occurredOn: Date
  ) {
    receiveInventoryStock(
      locationId: $locationId
      catalogItemId: $catalogItemId
      quantity: $quantity
      occurredOn: $occurredOn
    ) {
      ${STOCK_FIELDS}
    }
  }
`

export type ReceiveInventoryStockData = {
  receiveInventoryStock: InventoryStockRow
}

export const CONSUME_INVENTORY_STOCK_MUTATION = `
  mutation ConsumeInventoryStock(
    $stockId: Int!
    $quantity: Float!
    $occurredOn: Date
  ) {
    consumeInventoryStock(
      stockId: $stockId
      quantity: $quantity
      occurredOn: $occurredOn
    ) {
      ${STOCK_FIELDS}
    }
  }
`

export type ConsumeInventoryStockData = {
  consumeInventoryStock: InventoryStockRow
}

export const TRANSFER_INVENTORY_STOCK_MUTATION = `
  mutation TransferInventoryStock(
    $fromStockId: Int!
    $toLocationId: Int!
    $quantity: Float!
    $occurredOn: Date
  ) {
    transferInventoryStock(
      fromStockId: $fromStockId
      toLocationId: $toLocationId
      quantity: $quantity
      occurredOn: $occurredOn
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
