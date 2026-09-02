import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlInventoryStockCacheTag,
  graphqlInventoryStockMovementsCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'
import {
  CONSUME_INVENTORY_STOCK_MUTATION,
  DELETE_INVENTORY_STOCK_MUTATION,
  type ConsumeInventoryStockData,
  type DeleteInventoryStockData,
} from '@/lib/graphql/queries/inventory-stock'

import { consumeInventoryStockBodySchema } from '../schema'

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
    const catalogItemId = Number(searchParams.get('catalogItemId'))
    if (!Number.isInteger(locationId) || locationId < 1) {
      return errorJson('LOCATION_REQUIRED', 400)
    }
    if (!Number.isInteger(catalogItemId) || catalogItemId < 1) {
      return errorJson('CATALOG_ITEM_REQUIRED', 400)
    }

    const json = await req.json()
    const body = consumeInventoryStockBodySchema.parse(json)

    const data = await graphqlQuery<ConsumeInventoryStockData>(
      CONSUME_INVENTORY_STOCK_MUTATION,
      {
        stockId,
        quantity: body.quantity,
        occurredOn: body.occurredOn ?? null,
      },
      userId,
    )

    revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)
    revalidateTag(
      graphqlInventoryStockMovementsCacheTag(userId, locationId, catalogItemId),
      revalidateTagAfterMutation,
    )

    return NextResponse.json({ stock: data.consumeInventoryStock })
  } catch (error) {
    if (error instanceof ZodError) {
      return errorJson('INVALID_INPUT', 400, { issues: error.issues })
    }
    console.error('[inventory-stock] PATCH', error)
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return errorJson('FORBIDDEN', 403)
    }
    if (message.toLowerCase().includes('exceed')) {
      return errorJson('QUANTITY_EXCEEDED', 400)
    }
    return errorJson('INVALID_INPUT', 500)
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isInteger(id) || id < 1) {
      return errorJson('STOCK_ID_INVALID', 400)
    }

    const searchParams = new URL(_req.url).searchParams
    const locationId = Number(searchParams.get('locationId'))
    const catalogItemId = Number(searchParams.get('catalogItemId'))
    if (!Number.isInteger(locationId) || locationId < 1) {
      return errorJson('LOCATION_REQUIRED', 400)
    }

    await graphqlQuery<DeleteInventoryStockData>(DELETE_INVENTORY_STOCK_MUTATION, { id }, userId)

    revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)
    if (Number.isInteger(catalogItemId) && catalogItemId > 0) {
      revalidateTag(
        graphqlInventoryStockMovementsCacheTag(userId, locationId, catalogItemId),
        revalidateTagAfterMutation,
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[inventory-stock] DELETE', error)
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('not found')) {
      return errorJson('NOT_FOUND', 404)
    }
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return errorJson('FORBIDDEN', 403)
    }
    return errorJson('INVALID_INPUT', 500)
  }
}
