import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlInventoryCatalogCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'
import {
  DELETE_INVENTORY_CATALOG_ITEM_MUTATION,
  UPDATE_INVENTORY_CATALOG_ITEM_MUTATION,
  type DeleteInventoryCatalogItemData,
  type UpdateInventoryCatalogItemData,
} from '@/lib/graphql/queries/inventory-catalog'

import { updateInventoryCatalogBodySchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ message: 'Invalid catalog item id' }, { status: 400 })
    }

    const json = await req.json()
    const body = updateInventoryCatalogBodySchema.parse(json)

    const data = await graphqlQuery<UpdateInventoryCatalogItemData>(
      UPDATE_INVENTORY_CATALOG_ITEM_MUTATION,
      {
        id,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.packageSize !== undefined ? { packageSize: body.packageSize } : {}),
        ...(body.packageUnit !== undefined ? { packageUnit: body.packageUnit } : {}),
        ...(body.storageZone !== undefined ? { storageZone: body.storageZone } : {}),
      },
      userId,
    )

    revalidateTag(
      graphqlInventoryCatalogCacheTag(userId, data.updateInventoryCatalogItem.workspaceId),
      revalidateTagAfterMutation,
    )

    return NextResponse.json({ item: data.updateInventoryCatalogItem })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[inventory-catalog] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update catalog item'
    if (message.toLowerCase().includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('member')) {
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
      return NextResponse.json({ message: 'Invalid catalog item id' }, { status: 400 })
    }

    const searchParams = new URL(_req.url).searchParams
    const workspaceId = Number(searchParams.get('workspaceId'))
    if (!Number.isInteger(workspaceId) || workspaceId < 1) {
      return NextResponse.json({ message: 'workspaceId query param is required' }, { status: 400 })
    }

    await graphqlQuery<DeleteInventoryCatalogItemData>(
      DELETE_INVENTORY_CATALOG_ITEM_MUTATION,
      { id },
      userId,
    )

    revalidateTag(graphqlInventoryCatalogCacheTag(userId, workspaceId), revalidateTagAfterMutation)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[inventory-catalog] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete catalog item'
    if (message.toLowerCase().includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('member')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
