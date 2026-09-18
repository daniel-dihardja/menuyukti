export type PosOrderStatus = 'OPEN' | 'PAID' | 'VOID' | 'REFUNDED'
export type PosPaymentMethod = 'CASH' | 'CARD' | 'OTHER'

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
  sortOrder: number
}

export type PosOrder = {
  id: number
  locationId: number
  billNumber: string
  status: PosOrderStatus
  openedAt: string
  closedAt: string | null
  openedByClerkUserId: string
  paymentMethod: PosPaymentMethod | null
  discountAmount: number
  tableLabel: string | null
  note: string | null
  refundedAt: string | null
  lines: PosOrderLine[]
}

const POS_ORDER_FIELDS = `
  id
  locationId
  billNumber
  status
  openedAt
  closedAt
  openedByClerkUserId
  paymentMethod
  discountAmount
  tableLabel
  note
  refundedAt
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
    sortOrder
  }
`

export const POS_ORDERS_QUERY = `
  query PosOrders($locationId: Int!, $status: PosOrderStatus) {
    posOrders(locationId: $locationId, status: $status) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type PosOrdersData = {
  posOrders: PosOrder[]
}

export const OPEN_POS_ORDER_MUTATION = `
  mutation OpenPosOrder($locationId: Int!) {
    openPosOrder(locationId: $locationId) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type OpenPosOrderData = {
  openPosOrder: PosOrder
}

export const ADD_POS_ORDER_LINE_MUTATION = `
  mutation AddPosOrderLine($orderId: Int!, $menuItemId: Int!, $qty: Int!) {
    addPosOrderLine(orderId: $orderId, menuItemId: $menuItemId, qty: $qty) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type AddPosOrderLineData = {
  addPosOrderLine: PosOrder
}

export const UPDATE_POS_ORDER_LINE_MUTATION = `
  mutation UpdatePosOrderLine($lineId: Int!, $qty: Int!) {
    updatePosOrderLine(lineId: $lineId, qty: $qty) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type UpdatePosOrderLineData = {
  updatePosOrderLine: PosOrder
}

export const REMOVE_POS_ORDER_LINE_MUTATION = `
  mutation RemovePosOrderLine($lineId: Int!) {
    removePosOrderLine(lineId: $lineId) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type RemovePosOrderLineData = {
  removePosOrderLine: PosOrder
}

export const SET_POS_ORDER_DISCOUNT_MUTATION = `
  mutation SetPosOrderDiscount($orderId: Int!, $amount: Float!) {
    setPosOrderDiscount(orderId: $orderId, amount: $amount) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type SetPosOrderDiscountData = {
  setPosOrderDiscount: PosOrder
}

export const SET_POS_ORDER_TABLE_LABEL_MUTATION = `
  mutation SetPosOrderTableLabel($orderId: Int!, $tableLabel: String) {
    setPosOrderTableLabel(orderId: $orderId, tableLabel: $tableLabel) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type SetPosOrderTableLabelData = {
  setPosOrderTableLabel: PosOrder
}

export const CLOSE_POS_ORDER_MUTATION = `
  mutation ClosePosOrder($orderId: Int!, $paymentMethod: PosPaymentMethod!) {
    closePosOrder(orderId: $orderId, paymentMethod: $paymentMethod) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type ClosePosOrderData = {
  closePosOrder: PosOrder
}

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

export const REFUND_POS_ORDER_MUTATION = `
  mutation RefundPosOrder($orderId: Int!) {
    refundPosOrder(orderId: $orderId) {
      ${POS_ORDER_FIELDS}
    }
  }
`

export type RefundPosOrderData = {
  refundPosOrder: PosOrder
}
