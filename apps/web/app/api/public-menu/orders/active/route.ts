import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  MY_OPEN_PUBLIC_MENU_ORDER_QUERY,
  type MyOpenPublicMenuOrderData,
} from '@/lib/graphql/queries/location-menu'

function parseLocationId(raw: string | null): number | null {
  if (!raw) return null
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
}

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = parseLocationId(new URL(req.url).searchParams.get('locationId'))
    if (!locationId) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }

    const data = await graphqlQuery<MyOpenPublicMenuOrderData>(
      MY_OPEN_PUBLIC_MENU_ORDER_QUERY,
      { locationId },
      userId,
      'MyOpenPublicMenuOrder',
    )

    const order = data.myOpenPublicMenuOrder
    if (!order) {
      return NextResponse.json({ order: null }, { status: 200 })
    }

    return NextResponse.json({
      order: {
        orderId: order.id,
        billNumber: order.billNumber,
        status: order.status,
        prepStatus: order.prepStatus,
        fulfillmentMode: order.fulfillmentMode,
        tableLabel: order.tableLabel,
        lines: (order.lines ?? []).map((line) => ({
          menuItemId: line.menuItemId,
          name: line.name,
        })),
      },
    })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error('[public-menu/orders/active] GET', error)
    return NextResponse.json({ message: 'Failed to load open order' }, { status: 500 })
  }
}
