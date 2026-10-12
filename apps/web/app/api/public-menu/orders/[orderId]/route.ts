import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_MENU_ORDER_QUERY,
  type PublicMenuOrderData,
} from '@/lib/graphql/queries/location-menu'

function parseOrderId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId: raw } = await params
    const orderId = parseOrderId(raw)
    if (!orderId) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    const data = await graphqlQuery<PublicMenuOrderData>(
      PUBLIC_MENU_ORDER_QUERY,
      { orderId },
      userId,
      'PublicMenuOrder',
    )

    if (!data.publicMenuOrder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const order = data.publicMenuOrder
    return NextResponse.json({
      orderId: order.id,
      billNumber: order.billNumber,
      status: order.status,
      prepStatus: order.prepStatus,
      fulfillmentMode: order.fulfillmentMode,
      tableLabel: order.tableLabel,
    })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error('[public-menu/orders/[orderId]] GET', error)
    return NextResponse.json({ message: 'Failed to load order' }, { status: 500 })
  }
}
