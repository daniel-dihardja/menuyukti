import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  ADVANCE_POS_ORDER_PREP_STATUS_MUTATION,
  DIGITAL_MENU_ORDER_NOTE,
  DIGITAL_MENU_ORDERS_QUERY,
  VOID_POS_ORDER_MUTATION,
  type AdvancePosOrderPrepStatusData,
  type DigitalMenuOrdersData,
  type PosOrderStatus,
  type PosPrepStatus,
  type VoidPosOrderData,
} from '@/lib/graphql/queries/pos-orders'

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

const PREP_STATUSES = new Set<PosPrepStatus>([
  'RECEIVED',
  'PREPARING',
  'READY',
  'SERVED',
  'PICKED_UP',
  'DELIVERED',
])

const ORDER_STATUSES = new Set<PosOrderStatus>(['OPEN', 'PAID', 'VOID', 'REFUNDED'])

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
    const statusRaw = url.searchParams.get('status')
    const prepRaw = url.searchParams.get('prepStatus')

    let status: PosOrderStatus | null = 'OPEN'
    if (statusRaw != null && statusRaw !== '') {
      const upper = statusRaw.toUpperCase() as PosOrderStatus
      if (!ORDER_STATUSES.has(upper)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      status = upper
    }

    let prepStatus: PosPrepStatus | null = null
    if (prepRaw != null && prepRaw !== '') {
      const upper = prepRaw.toUpperCase() as PosPrepStatus
      if (!PREP_STATUSES.has(upper)) {
        return NextResponse.json({ error: 'Invalid prepStatus' }, { status: 400 })
      }
      prepStatus = upper
    }

    const data = await graphqlQuery<DigitalMenuOrdersData>(
      DIGITAL_MENU_ORDERS_QUERY,
      {
        locationId,
        status,
        note: DIGITAL_MENU_ORDER_NOTE,
        prepStatus,
      },
      userId,
      'DigitalMenuOrders',
    )
    return NextResponse.json({ orders: data.posOrders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type OrdersActionBody = {
  action?: unknown
  orderId?: unknown
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

    const body = (await req.json()) as OrdersActionBody
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'advancePrep') {
      const orderId = Number(body.orderId)
      if (!Number.isInteger(orderId) || orderId < 1) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
      }
      const data = await graphqlQuery<AdvancePosOrderPrepStatusData>(
        ADVANCE_POS_ORDER_PREP_STATUS_MUTATION,
        { orderId },
        userId,
        'AdvancePosOrderPrepStatus',
      )
      return NextResponse.json({ order: data.advancePosOrderPrepStatus })
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

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Orders action failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
