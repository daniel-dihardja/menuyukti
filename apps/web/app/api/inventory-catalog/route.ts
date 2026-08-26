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
  CREATE_INVENTORY_CATALOG_ITEM_MUTATION,
  type CreateInventoryCatalogItemData,
} from '@/lib/graphql/queries/inventory-catalog'

import { createInventoryCatalogBodySchema } from './schema'

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const body = createInventoryCatalogBodySchema.parse(json)

    const data = await graphqlQuery<CreateInventoryCatalogItemData>(
      CREATE_INVENTORY_CATALOG_ITEM_MUTATION,
      body,
      userId,
    )

    revalidateTag(
      graphqlInventoryCatalogCacheTag(userId, body.workspaceId),
      revalidateTagAfterMutation,
    )

    return NextResponse.json({ item: data.createInventoryCatalogItem }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[inventory-catalog] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create catalog item'
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('member')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
