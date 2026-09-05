import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { actorFromProfileMap, getClerkUserProfilesByIds } from '@/lib/clerk/user-profiles'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlInventoryCatalogCacheTag,
  graphqlInventoryStockCacheTag,
  graphqlInventoryStockMovementsCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'
import {
  CREATE_INVENTORY_CATALOG_ITEM_WITH_STOCK_MUTATION,
  INVENTORY_STOCK_MOVEMENTS_QUERY,
  RECEIVE_INVENTORY_STOCK_MUTATION,
  TRANSFER_INVENTORY_STOCK_MUTATION,
  UPSERT_INVENTORY_STOCK_MUTATION,
  type CreateInventoryCatalogItemWithStockData,
  type InventoryStockMovementsData,
  type ReceiveInventoryStockData,
  type TransferInventoryStockData,
  type UpsertInventoryStockData,
} from '@/lib/graphql/queries/inventory-stock'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'

import {
  createInventoryCatalogItemWithStockBodySchema,
  receiveInventoryStockBodySchema,
  transferInventoryStockBodySchema,
  upsertInventoryStockBodySchema,
} from './schema'

function errorJson(code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ code, ...extra }, { status })
}

async function revalidateInventarTags(
  userId: string,
  locationId: number,
  workspaceId: number | null,
  catalogItemId?: number,
) {
  revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)
  if (catalogItemId != null) {
    revalidateTag(
      graphqlInventoryStockMovementsCacheTag(userId, locationId, catalogItemId),
      revalidateTagAfterMutation,
    )
  }
  if (workspaceId != null) {
    revalidateTag(graphqlInventoryCatalogCacheTag(userId, workspaceId), revalidateTagAfterMutation)
  }
}

async function resolveWorkspaceId(userId: string): Promise<number | null> {
  const data = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
  const id = data.myWorkspace?.id
  if (id == null) return null
  const parsed = Number(id)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = new URL(req.url).searchParams
    const locationId = Number(searchParams.get('locationId'))
    const catalogItemId = Number(searchParams.get('catalogItemId'))
    const stockIdRaw = searchParams.get('stockId')
    const stockId = stockIdRaw != null ? Number(stockIdRaw) : null
    const limitRaw = searchParams.get('limit')
    const limit = limitRaw != null ? Number(limitRaw) : 50
    const fromDateRaw = searchParams.get('fromDate')
    const toDateRaw = searchParams.get('toDate')

    if (!Number.isInteger(locationId) || locationId < 1) {
      return errorJson('LOCATION_REQUIRED', 400)
    }
    if (!Number.isInteger(catalogItemId) || catalogItemId < 1) {
      return errorJson('CATALOG_ITEM_REQUIRED', 400)
    }
    if (stockIdRaw != null && (!Number.isInteger(stockId) || stockId! < 1)) {
      return errorJson('STOCK_ID_INVALID', 400)
    }

    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/
    if (fromDateRaw != null && !isoDateRe.test(fromDateRaw)) {
      return errorJson('INVALID_DATE', 400)
    }
    if (toDateRaw != null && !isoDateRe.test(toDateRaw)) {
      return errorJson('INVALID_DATE', 400)
    }
    if (fromDateRaw != null && toDateRaw != null && fromDateRaw > toDateRaw) {
      return errorJson('DATE_RANGE_INVALID', 400)
    }

    const data = await graphqlQuery<InventoryStockMovementsData>(
      INVENTORY_STOCK_MOVEMENTS_QUERY,
      {
        locationId: String(locationId),
        catalogItemId: String(catalogItemId),
        ...(stockId != null ? { stockId: String(stockId) } : {}),
        ...(fromDateRaw != null ? { fromDate: fromDateRaw } : {}),
        ...(toDateRaw != null ? { toDate: toDateRaw } : {}),
        limit: Number.isInteger(limit) && limit > 0 ? limit : 50,
      },
      userId,
    )

    const movementsRaw = data.inventoryStockMovements
    const profiles = await getClerkUserProfilesByIds(
      movementsRaw.map((movement) => movement.createdByClerkUserId),
    )
    const movements = movementsRaw.map((movement) => ({
      ...movement,
      createdBy: actorFromProfileMap(movement.createdByClerkUserId, profiles),
    }))

    return NextResponse.json({ movements })
  } catch (error) {
    console.error('[inventory-stock] GET', error)
    return errorJson('INVALID_INPUT', 500)
  }
}

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const searchParams = new URL(req.url).searchParams
    const mode = searchParams.get('mode')

    if (mode === 'upsert') {
      const body = upsertInventoryStockBodySchema.parse(json)
      const workspacePromise = resolveWorkspaceId(userId)
      const [data, workspaceId] = await Promise.all([
        graphqlQuery<UpsertInventoryStockData>(UPSERT_INVENTORY_STOCK_MUTATION, body, userId),
        workspacePromise,
      ])
      await revalidateInventarTags(userId, body.locationId, workspaceId, body.catalogItemId)
      return NextResponse.json({ stock: data.upsertInventoryStock })
    }

    if (mode === 'receive') {
      const body = receiveInventoryStockBodySchema.parse(json)
      const workspacePromise = resolveWorkspaceId(userId)
      const [data, workspaceId] = await Promise.all([
        graphqlQuery<ReceiveInventoryStockData>(
          RECEIVE_INVENTORY_STOCK_MUTATION,
          {
            locationId: body.locationId,
            catalogItemId: body.catalogItemId,
            quantity: body.quantity,
            occurredOn: body.occurredOn ?? null,
          },
          userId,
        ),
        workspacePromise,
      ])
      await revalidateInventarTags(userId, body.locationId, workspaceId, body.catalogItemId)
      return NextResponse.json({ stock: data.receiveInventoryStock })
    }

    if (mode === 'transfer') {
      const body = transferInventoryStockBodySchema.parse(json)
      const data = await graphqlQuery<TransferInventoryStockData>(
        TRANSFER_INVENTORY_STOCK_MUTATION,
        {
          fromStockId: body.fromStockId,
          toLocationId: body.toLocationId,
          quantity: body.quantity,
          occurredOn: body.occurredOn ?? null,
        },
        userId,
      )
      const transfer = data.transferInventoryStock
      const catalogItemId = transfer.toStock.catalogItemId
      revalidateTag(
        graphqlInventoryStockCacheTag(userId, transfer.fromLocationId),
        revalidateTagAfterMutation,
      )
      revalidateTag(
        graphqlInventoryStockCacheTag(userId, transfer.toLocationId),
        revalidateTagAfterMutation,
      )
      revalidateTag(
        graphqlInventoryStockMovementsCacheTag(userId, transfer.fromLocationId, catalogItemId),
        revalidateTagAfterMutation,
      )
      revalidateTag(
        graphqlInventoryStockMovementsCacheTag(userId, transfer.toLocationId, catalogItemId),
        revalidateTagAfterMutation,
      )
      return NextResponse.json({ transfer })
    }

    const body = createInventoryCatalogItemWithStockBodySchema.parse(json)
    const workspacePromise = resolveWorkspaceId(userId)
    const [data, workspaceId] = await Promise.all([
      graphqlQuery<CreateInventoryCatalogItemWithStockData>(
        CREATE_INVENTORY_CATALOG_ITEM_WITH_STOCK_MUTATION,
        body,
        userId,
      ),
      workspacePromise,
    ])
    await revalidateInventarTags(
      userId,
      body.locationId,
      workspaceId,
      data.createInventoryCatalogItemWithStock.catalogItemId,
    )
    return NextResponse.json({ stock: data.createInventoryCatalogItemWithStock }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return errorJson('INVALID_INPUT', 400, { issues: error.issues })
    }
    console.error('[inventory-stock] POST', error)
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return errorJson('FORBIDDEN', 403)
    }
    return errorJson('INVALID_INPUT', 500)
  }
}
