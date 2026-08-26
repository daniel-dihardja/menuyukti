import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlInventoryCatalogCacheTag,
  graphqlInventoryStockCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'
import {
  DELETE_INVENTORY_STOCK_MUTATION,
  UPSERT_INVENTORY_STOCK_MUTATION,
  type DeleteInventoryStockData,
  type UpsertInventoryStockData,
} from '@/lib/graphql/queries/inventory-stock'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'

import { patchInventoryStockBodySchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function resolveWorkspaceId(userId: string): Promise<number | null> {
  const data = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
  const id = data.myWorkspace?.id
  if (id == null) return null
  const parsed = Number(id)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
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
      return NextResponse.json({ message: 'Invalid stock id' }, { status: 400 })
    }

    const searchParams = new URL(req.url).searchParams
    const locationId = Number(searchParams.get('locationId'))
    const catalogItemId = Number(searchParams.get('catalogItemId'))
    if (!Number.isInteger(locationId) || locationId < 1) {
      return NextResponse.json({ message: 'locationId query param is required' }, { status: 400 })
    }
    if (!Number.isInteger(catalogItemId) || catalogItemId < 1) {
      return NextResponse.json(
        { message: 'catalogItemId query param is required' },
        { status: 400 },
      )
    }

    const json = await req.json()
    const body = patchInventoryStockBodySchema.parse(json)

    const data = await graphqlQuery<UpsertInventoryStockData>(
      UPSERT_INVENTORY_STOCK_MUTATION,
      { locationId, catalogItemId, onHand: body.onHand },
      userId,
    )

    const workspaceId = await resolveWorkspaceId(userId)
    revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)
    if (workspaceId != null) {
      revalidateTag(
        graphqlInventoryCatalogCacheTag(userId, workspaceId),
        revalidateTagAfterMutation,
      )
    }

    return NextResponse.json({ stock: data.upsertInventoryStock })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[inventory-stock] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update stock'
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
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
      return NextResponse.json({ message: 'Invalid stock id' }, { status: 400 })
    }

    const searchParams = new URL(_req.url).searchParams
    const locationId = Number(searchParams.get('locationId'))
    if (!Number.isInteger(locationId) || locationId < 1) {
      return NextResponse.json({ message: 'locationId query param is required' }, { status: 400 })
    }

    await graphqlQuery<DeleteInventoryStockData>(DELETE_INVENTORY_STOCK_MUTATION, { id }, userId)

    revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[inventory-stock] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to remove stock'
    if (message.toLowerCase().includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
