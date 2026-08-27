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
  CREATE_INVENTORY_CATALOG_ITEM_WITH_STOCK_MUTATION,
  TRANSFER_INVENTORY_STOCK_MUTATION,
  UPSERT_INVENTORY_STOCK_MUTATION,
  type CreateInventoryCatalogItemWithStockData,
  type TransferInventoryStockData,
  type UpsertInventoryStockData,
} from '@/lib/graphql/queries/inventory-stock'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'

import {
  createInventoryCatalogItemWithStockBodySchema,
  transferInventoryStockBodySchema,
  upsertInventoryStockBodySchema,
} from './schema'

async function revalidateInventarTags(
  userId: string,
  locationId: number,
  workspaceId: number | null,
) {
  revalidateTag(graphqlInventoryStockCacheTag(userId, locationId), revalidateTagAfterMutation)
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
      const data = await graphqlQuery<UpsertInventoryStockData>(
        UPSERT_INVENTORY_STOCK_MUTATION,
        body,
        userId,
      )
      const workspaceId = await resolveWorkspaceId(userId)
      await revalidateInventarTags(userId, body.locationId, workspaceId)
      return NextResponse.json({ stock: data.upsertInventoryStock })
    }

    if (mode === 'transfer') {
      const body = transferInventoryStockBodySchema.parse(json)
      const data = await graphqlQuery<TransferInventoryStockData>(
        TRANSFER_INVENTORY_STOCK_MUTATION,
        body,
        userId,
      )
      const transfer = data.transferInventoryStock
      revalidateTag(
        graphqlInventoryStockCacheTag(userId, transfer.fromLocationId),
        revalidateTagAfterMutation,
      )
      revalidateTag(
        graphqlInventoryStockCacheTag(userId, transfer.toLocationId),
        revalidateTagAfterMutation,
      )
      return NextResponse.json({ transfer })
    }

    const body = createInventoryCatalogItemWithStockBodySchema.parse(json)
    const data = await graphqlQuery<CreateInventoryCatalogItemWithStockData>(
      CREATE_INVENTORY_CATALOG_ITEM_WITH_STOCK_MUTATION,
      body,
      userId,
    )
    const workspaceId = await resolveWorkspaceId(userId)
    await revalidateInventarTags(userId, body.locationId, workspaceId)
    return NextResponse.json({ stock: data.createInventoryCatalogItemWithStock }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[inventory-stock] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to update stock'
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
