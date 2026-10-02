import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  SUBMIT_PUBLIC_MENU_ORDER_MUTATION,
  type SubmitPublicMenuOrderData,
} from '@/lib/graphql/queries/location-menu'

const submitPublicMenuOrderSchema = z.object({
  locationId: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        qty: z.number().int().positive().max(99),
      }),
    )
    .min(1)
    .max(50),
  tableLabel: z.string().trim().max(64).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const payload = submitPublicMenuOrderSchema.parse(json)
    const tableLabel = payload.tableLabel?.trim() || null

    const data = await graphqlQuery<SubmitPublicMenuOrderData>(
      SUBMIT_PUBLIC_MENU_ORDER_MUTATION,
      {
        locationId: payload.locationId,
        lines: payload.lines.map((line) => ({
          menuItemId: line.menuItemId,
          qty: line.qty,
        })),
        tableLabel,
      },
      userId,
      'SubmitPublicMenuOrder',
    )

    const order = data.submitPublicMenuOrder
    return NextResponse.json(
      {
        orderId: order.id,
        billNumber: order.billNumber,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: 'Invalid input',
          issues: error.issues,
        },
        { status: 400 },
      )
    }

    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    console.error('[public-menu/orders] POST', error)
    return NextResponse.json({ message: 'Failed to submit order' }, { status: 500 })
  }
}
