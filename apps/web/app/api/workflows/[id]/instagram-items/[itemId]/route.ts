import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_INSTAGRAM_ITEM_MUTATION,
  INSTAGRAM_ITEM_QUERY,
  UPDATE_INSTAGRAM_ITEM_MUTATION,
  type DeleteInstagramItemData,
  type InstagramItemData,
  type UpdateInstagramItemData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

import { itemIdParamSchema, patchInstagramItemBodySchema, workflowIdParamSchema } from '../schema'
import { withItemImageUrl } from '../with-image-url'

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

async function loadWorkflowRootOrThrow(workflowId: string, userId: string) {
  const data = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
  )
  const node = data.node
  if (!node) {
    return { error: NextResponse.json({ message: 'Workflow not found' }, { status: 404 }) }
  }
  if (node.nodeType !== 'workflow') {
    return { error: NextResponse.json({ message: 'Not a workflow root' }, { status: 400 }) }
  }
  if (node.locationId == null) {
    return { error: NextResponse.json({ message: 'Workflow has no location' }, { status: 400 }) }
  }
  return { node, locationId: node.locationId }
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawWorkflowId, itemId: rawItemId } = await context.params
    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const itemParsed = itemIdParamSchema.safeParse(rawItemId)
    if (!workflowParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    if (!itemParsed.success) {
      return NextResponse.json({ message: 'Invalid Instagram item id' }, { status: 400 })
    }

    const workflowRoot = await loadWorkflowRootOrThrow(workflowParsed.data, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }

    const data = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )
    const item = data.instagramItem
    if (!item || item.workflowId !== workflowParsed.data) {
      return NextResponse.json({ message: 'Instagram item not found' }, { status: 404 })
    }

    return NextResponse.json({ item: await withItemImageUrl(item) })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to load Instagram item'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawWorkflowId, itemId: rawItemId } = await context.params
    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const itemParsed = itemIdParamSchema.safeParse(rawItemId)
    if (!workflowParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    if (!itemParsed.success) {
      return NextResponse.json({ message: 'Invalid Instagram item id' }, { status: 400 })
    }

    const workflowRoot = await loadWorkflowRootOrThrow(workflowParsed.data, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const input = patchInstagramItemBodySchema.safeParse(body)
    if (!input.success) {
      return NextResponse.json(
        { message: 'Invalid input', issues: input.error.issues },
        { status: 400 },
      )
    }

    const existing = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )
    if (!existing.instagramItem || existing.instagramItem.workflowId !== workflowParsed.data) {
      return NextResponse.json({ message: 'Instagram item not found' }, { status: 404 })
    }

    const data = await graphqlQuery<UpdateInstagramItemData>(
      UPDATE_INSTAGRAM_ITEM_MUTATION,
      {
        id: itemParsed.data,
        ...input.data,
      },
      userId,
    )

    return NextResponse.json({ item: await withItemImageUrl(data.updateInstagramItem) })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to update Instagram item'
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

    const { id: rawWorkflowId, itemId: rawItemId } = await context.params
    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const itemParsed = itemIdParamSchema.safeParse(rawItemId)
    if (!workflowParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    if (!itemParsed.success) {
      return NextResponse.json({ message: 'Invalid Instagram item id' }, { status: 400 })
    }

    const workflowRoot = await loadWorkflowRootOrThrow(workflowParsed.data, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }

    const existing = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )
    if (!existing.instagramItem || existing.instagramItem.workflowId !== workflowParsed.data) {
      return NextResponse.json({ message: 'Instagram item not found' }, { status: 404 })
    }

    const data = await graphqlQuery<DeleteInstagramItemData>(
      DELETE_INSTAGRAM_ITEM_MUTATION,
      { id: itemParsed.data },
      userId,
    )

    return NextResponse.json({ deleted: data.deleteInstagramItem })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to delete Instagram item'
    return NextResponse.json({ message }, { status: 500 })
  }
}
