import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlInventoryStockCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'
import {
  UPDATE_INVENTORY_STOCK_LIMITS_MUTATION,
  type UpdateInventoryStockLimitsData,
} from '@/lib/graphql/queries/inventory-stock'

import { updateInventoryStockLimitsBodySchema } from '../../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

function errorJson(code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ code, ...extra }, { status })
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const stockId = Number(idParam)
    if (!Number.isInteger(stockId) || stockId < 1) {
      return errorJson('STOCK_ID_INVALID', 400)
    }

    const searchParams = new URL(req.url).searchParams
    const locationId = Number(searchParams.get('locationId'))
    if (!Number.isInteger(locationId) || locationId < 1) {
      return errorJson('LOCATION_REQUIRED', 400)
    }

    const json = await req.json()
    const body = updateInventoryStockLimitsBodySchema.parse(json)

    const data = await graphqlQuery<UpdateInventoryStockLimitsData>(
      UPDATE_INVENTORY_STOCK_LIMITS_MUTATION,
      {
        id: stockId,
        minOnHand: body.minOnHand,
        maxOnHand: body.maxOnHand,
      },
      userId,
    )

    revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)

    return NextResponse.json({ stock: data.updateInventoryStockLimits })
  } catch (error) {
    if (error instanceof ZodError) {
      return errorJson('INVALID_INPUT', 400, { issues: error.issues })
    }
    console.error('[inventory-stock/limits] PATCH', error)
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return errorJson('FORBIDDEN', 403)
    }
    if (message.toLowerCase().includes('not found')) {
      return errorJson('NOT_FOUND', 404)
    }
    return NextResponse.json(
      { code: 'INVALID_INPUT', message: message || 'Failed to update stock limits' },
      { status: 500 },
    )
  }
}
