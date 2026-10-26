/**
 * Digital-menu order ticket types and GraphQL docs used by the Order board
 * and guest public-menu flows. Cashier-only POS client docs were removed with
 * the deferred native POS UI (TASK-5.8); persistence remains PosOrder in GraphQL.
 */

export type PosOrderStatus = 'OPEN' | 'PAID' | 'VOID' | 'REFUNDED'
export type PosPrepStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'PICKED_UP'
  | 'DELIVERED'

export type PosOrderLineModifier = {
  id: number
  posOrderLineId: number
  groupNameSnapshot: string
  nameSnapshot: string
  priceDeltaSnapshot: number
  sortOrder: number
}

export type PosTaxBreakdown = {
  taxRateBps: number
  net: number
  tax: number
  gross: number
}

export type PosOrderLine = {
  id: number
  posOrderId: number
  menuItemId: number
  nameSnapshot: string
  menuCategorySnapshot: string
  menuCategoryDetailSnapshot: string
  qty: number
  unitPrice: number
  lineTotal: number
  taxClass: string
  taxRateBps: number
  net: number
  tax: number
  note: string | null
  sortOrder: number
  modifiers: PosOrderLineModifier[]
}

export type PosFiscalProcess = {
  id: number
  kind: string
  state: string
  provider: string
  tseTransactionId: string | null
  tseSignature: string | null
  signatureCounter: number | null
  certificateSerial: string | null
  clientId: string | null
  qrPayload: string | null
  processType: string
  startedAt: string | null
  finishedAt: string | null
  lastError: string | null
}

export type PosOrder = {
  id: number
  locationId: number
  registerId: number | null
  billNumber: string
  status: PosOrderStatus
  openedAt: string
  closedAt: string | null
  openedByClerkUserId: string
  paymentMethod: 'CASH' | 'CARD' | 'OTHER' | null
  discountAmount: number
  net: number
  tax: number
  gross: number
  taxBreakdown: PosTaxBreakdown[]
  tableLabel: string | null
  fulfillmentMode: 'DINE_IN' | 'PICKUP' | 'DELIVERY' | null
  prepStatus: PosPrepStatus | null
  deliveryAddress: string | null
  deliveryPhone: string | null
  deliveryNotes: string | null
  note: string | null
  refundedAt: string | null
  fiscalProcesses: PosFiscalProcess[]
  lines: PosOrderLine[]
}

const POS_ORDER_FIELDS = `
  id
  locationId
  registerId
  billNumber
  status
  openedAt
  closedAt
  openedByClerkUserId
  paymentMethod
  discountAmount
  net
  tax
  gross
  taxBreakdown {
    taxRateBps
    net
    tax
    gross
  }
  tableLabel
  fulfillmentMode
  prepStatus
  deliveryAddress
  deliveryPhone
  deliveryNotes
  note
  refundedAt
  fiscalProcesses {
    id
    kind
    state
    provider
    tseTransactionId
    tseSignature
    signatureCounter
    certificateSerial
    clientId
    qrPayload
    processType
    startedAt
    finishedAt
    lastError
  }
  lines {
    id
    posOrderId
    menuItemId
    nameSnapshot
    menuCategorySnapshot
    menuCategoryDetailSnapshot
    qty
    unitPrice
    lineTotal
    taxClass
    taxRateBps
    net
    tax
    note
    sortOrder
    modifiers {
      id
      posOrderLineId
      groupNameSnapshot
      nameSnapshot
      priceDeltaSnapshot
      sortOrder
    }
  }
`

/** Staff Order board: digital-menu tickets for a location (filtered list). */
export const DIGITAL_MENU_ORDERS_QUERY = `
  query DigitalMenuOrders(
    $locationId: Int!
    $status: PosOrderStatus
    $note: String
    $prepStatus: PosPrepStatus
  ) {
    posOrders(
      locationId: $locationId
      status: $status
      note: $note
      prepStatus: $prepStatus
    ) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type DigitalMenuOrdersData = {
  posOrders: PosOrder[]
}

/** Tag used on guest digital-menu tickets (`PosOrder.note`). */
export const DIGITAL_MENU_ORDER_NOTE = 'digital_menu' as const

export const VOID_POS_ORDER_MUTATION = `
  mutation VoidPosOrder($orderId: Int!) {
    voidPosOrder(orderId: $orderId) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type VoidPosOrderData = {
  voidPosOrder: PosOrder
}

export const ADVANCE_POS_ORDER_PREP_STATUS_MUTATION = `
  mutation AdvancePosOrderPrepStatus($orderId: Int!) {
    advancePosOrderPrepStatus(orderId: $orderId) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type AdvancePosOrderPrepStatusData = {
  advancePosOrderPrepStatus: PosOrder
}
