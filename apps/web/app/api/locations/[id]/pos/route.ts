import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  ADD_POS_ORDER_LINE_MUTATION,
  CLOSE_POS_ORDER_MUTATION,
  OPEN_POS_ORDER_MUTATION,
  POS_DAY_SUMMARY_QUERY,
  POS_ORDERS_QUERY,
  REFUND_POS_ORDER_MUTATION,
  REMOVE_POS_ORDER_LINE_MUTATION,
  SET_POS_ORDER_DISCOUNT_MUTATION,
  SET_POS_ORDER_LINE_NOTE_MUTATION,
  SET_POS_ORDER_TABLE_LABEL_MUTATION,
  UPDATE_POS_ORDER_LINE_MUTATION,
  VOID_POS_ORDER_MUTATION,
  type AddPosOrderLineData,
  type ClosePosOrderData,
  type OpenPosOrderData,
  type PosDaySummaryData,
  type PosOrdersData,
  type PosPaymentMethod,
  type RefundPosOrderData,
  type RemovePosOrderLineData,
  type SetPosOrderDiscountData,
  type SetPosOrderLineNoteData,
  type SetPosOrderTableLabelData,
  type UpdatePosOrderLineData,
  type VoidPosOrderData,
} from '@/lib/graphql/queries/pos-orders'

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

function parseModifierOptionIds(raw: unknown): number[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) return null
  const ids: number[] = []
  for (const entry of raw) {
    const id = Number(entry)
    if (!Number.isInteger(id) || id < 1) return null
    ids.push(id)
  }
  return ids
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const locationId = parseLocationId(id)
    if (!locationId) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }

    const url = new URL(req.url)
    const daySummary = url.searchParams.get('daySummary')
    const onDate = url.searchParams.get('onDate')

    if (daySummary === '1' || daySummary === 'true') {
      if (onDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) {
        return NextResponse.json({ error: 'Invalid onDate' }, { status: 400 })
      }
      const data = await graphqlQuery<PosDaySummaryData>(
        POS_DAY_SUMMARY_QUERY,
        { locationId, onDate: onDate ?? null },
        userId,
        'PosDaySummary',
      )
      return NextResponse.json({ summary: data.posDaySummary })
    }

    const data = await graphqlQuery<PosOrdersData>(
      POS_ORDERS_QUERY,
      { locationId },
      userId,
      'PosOrders',
    )
    return NextResponse.json({ orders: data.posOrders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load POS orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type PosActionBody = {
  action?: unknown
  orderId?: unknown
  menuItemId?: unknown
  lineId?: unknown
  qty?: unknown
  amount?: unknown
  paymentMethod?: unknown
  tableLabel?: unknown
  modifierOptionIds?: unknown
  note?: unknown
  onDate?: unknown
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const locationId = parseLocationId(id)
    if (!locationId) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }

    const body = (await req.json()) as PosActionBody
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'open') {
      const data = await graphqlQuery<OpenPosOrderData>(
        OPEN_POS_ORDER_MUTATION,
        { locationId },
        userId,
        'OpenPosOrder',
      )
      return NextResponse.json({ order: data.openPosOrder })
    }

    if (action === 'addLine') {
      const orderId = Number(body.orderId)
      const menuItemId = Number(body.menuItemId)
      const qty = body.qty === undefined ? 1 : Number(body.qty)
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      if (!Number.isInteger(menuItemId) || menuItemId < 1) {
        return NextResponse.json({ error: 'Invalid menuItemId' }, { status: 400 })
      }
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: 'Invalid qty' }, { status: 400 })
      }
      const modifierOptionIds = parseModifierOptionIds(body.modifierOptionIds)
      if (modifierOptionIds === null) {
        return NextResponse.json({ error: 'Invalid modifierOptionIds' }, { status: 400 })
      }
      let note: string | null = null
      if (body.note != null) {
        if (typeof body.note !== 'string') {
          return NextResponse.json({ error: 'Invalid note' }, { status: 400 })
        }
        note = body.note
      }
      const data = await graphqlQuery<AddPosOrderLineData>(
        ADD_POS_ORDER_LINE_MUTATION,
        {
          orderId,
          menuItemId,
          qty,
          modifierOptionIds: modifierOptionIds.length > 0 ? modifierOptionIds : null,
          note,
        },
        userId,
        'AddPosOrderLine',
      )
      return NextResponse.json({ order: data.addPosOrderLine })
    }

    if (action === 'updateLine') {
      const lineId = Number(body.lineId)
      const qty = Number(body.qty)
      if (!Number.isInteger(lineId) || lineId < 1) {
        return NextResponse.json({ error: 'Invalid lineId' }, { status: 400 })
      }
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: 'Invalid qty' }, { status: 400 })
      }
      const data = await graphqlQuery<UpdatePosOrderLineData>(
        UPDATE_POS_ORDER_LINE_MUTATION,
        { lineId, qty },
        userId,
        'UpdatePosOrderLine',
      )
      return NextResponse.json({ order: data.updatePosOrderLine })
    }

    if (action === 'setLineNote') {
      const lineId = Number(body.lineId)
      if (!Number.isInteger(lineId) || lineId < 1) {
        return NextResponse.json({ error: 'Invalid lineId' }, { status: 400 })
      }
      let note: string | null = null
      if (body.note != null) {
        if (typeof body.note !== 'string') {
          return NextResponse.json({ error: 'Invalid note' }, { status: 400 })
        }
        note = body.note
      }
      const data = await graphqlQuery<SetPosOrderLineNoteData>(
        SET_POS_ORDER_LINE_NOTE_MUTATION,
        { lineId, note },
        userId,
        'SetPosOrderLineNote',
      )
      return NextResponse.json({ order: data.setPosOrderLineNote })
    }

    if (action === 'removeLine') {
      const lineId = Number(body.lineId)
      if (!Number.isInteger(lineId) || lineId < 1) {
        return NextResponse.json({ error: 'Invalid lineId' }, { status: 400 })
      }
      const data = await graphqlQuery<RemovePosOrderLineData>(
        REMOVE_POS_ORDER_LINE_MUTATION,
        { lineId },
        userId,
        'RemovePosOrderLine',
      )
      return NextResponse.json({ order: data.removePosOrderLine })
    }

    if (action === 'setDiscount') {
      const orderId = Number(body.orderId)
      const amount = Number(body.amount)
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }
      const data = await graphqlQuery<SetPosOrderDiscountData>(
        SET_POS_ORDER_DISCOUNT_MUTATION,
        { orderId, amount },
        userId,
        'SetPosOrderDiscount',
      )
      return NextResponse.json({ order: data.setPosOrderDiscount })
    }

    if (action === 'setTableLabel') {
      const orderId = Number(body.orderId)
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      let tableLabel: string | null = null
      if (body.tableLabel != null) {
        if (typeof body.tableLabel !== 'string') {
          return NextResponse.json({ error: 'Invalid tableLabel' }, { status: 400 })
        }
        tableLabel = body.tableLabel
      }
      const data = await graphqlQuery<SetPosOrderTableLabelData>(
        SET_POS_ORDER_TABLE_LABEL_MUTATION,
        { orderId, tableLabel },
        userId,
        'SetPosOrderTableLabel',
      )
      return NextResponse.json({ order: data.setPosOrderTableLabel })
    }

    if (action === 'close') {
      const orderId = Number(body.orderId)
      const paymentMethod = String(body.paymentMethod ?? '').toUpperCase() as PosPaymentMethod
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      if (!['CASH', 'CARD', 'OTHER'].includes(paymentMethod)) {
        return NextResponse.json({ error: 'Invalid paymentMethod' }, { status: 400 })
      }
      const data = await graphqlQuery<ClosePosOrderData>(
        CLOSE_POS_ORDER_MUTATION,
        { orderId, paymentMethod },
        userId,
        'ClosePosOrder',
      )
      return NextResponse.json({ order: data.closePosOrder })
    }

    if (action === 'void') {
      const orderId = Number(body.orderId)
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      const data = await graphqlQuery<VoidPosOrderData>(
        VOID_POS_ORDER_MUTATION,
        { orderId },
        userId,
        'VoidPosOrder',
      )
      return NextResponse.json({ order: data.voidPosOrder })
    }

    if (action === 'refund') {
      const orderId = Number(body.orderId)
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      const data = await graphqlQuery<RefundPosOrderData>(
        REFUND_POS_ORDER_MUTATION,
        { orderId },
        userId,
        'RefundPosOrder',
      )
      return NextResponse.json({ order: data.refundPosOrder })
    }

    if (action === 'daySummary') {
      let onDate: string | null = null
      if (body.onDate != null) {
        if (typeof body.onDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.onDate)) {
          return NextResponse.json({ error: 'Invalid onDate' }, { status: 400 })
        }
        onDate = body.onDate
      }
      const data = await graphqlQuery<PosDaySummaryData>(
        POS_DAY_SUMMARY_QUERY,
        { locationId, onDate },
        userId,
        'PosDaySummary',
      )
      return NextResponse.json({ summary: data.posDaySummary })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'POS action failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
