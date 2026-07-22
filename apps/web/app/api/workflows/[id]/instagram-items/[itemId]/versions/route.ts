import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { deletePostMediaKeys, isObjectKeyForPost } from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_INSTAGRAM_ITEM_MEDIA_VERSION_MUTATION,
  INSTAGRAM_ITEM_QUERY,
  type DeleteInstagramItemMediaVersionData,
  type InstagramItemData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

import {
  deleteInstagramItemMediaVersionBodySchema,
  itemIdParamSchema,
  workflowIdParamSchema,
} from '../../schema'
import { withItemImageUrl } from '../../with-image-url'

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

export async function DELETE(req: Request, context: RouteContext) {
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

    const parsedBody = deleteInstagramItemMediaVersionBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ message: 'mediaS3Key is required' }, { status: 400 })
    }

    const { mediaS3Key } = parsedBody.data
    if (!isObjectKeyForPost(mediaS3Key, userId)) {
      return NextResponse.json({ message: 'Invalid media key' }, { status: 400 })
    }

    const existing = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )
    const item = existing.instagramItem
    if (!item || item.workflowId !== workflowParsed.data) {
      return NextResponse.json({ message: 'Instagram item not found' }, { status: 404 })
    }

    const isKnownVersion = (item.mediaVersions ?? []).some(
      (version) => version.mediaS3Key === mediaS3Key,
    )
    if (!isKnownVersion) {
      return NextResponse.json(
        { message: 'Media version not found for this Instagram item' },
        { status: 400 },
      )
    }

    const mutationData = await graphqlQuery<DeleteInstagramItemMediaVersionData>(
      DELETE_INSTAGRAM_ITEM_MEDIA_VERSION_MUTATION,
      { itemId: itemParsed.data, mediaS3Key },
      userId,
    )

    try {
      await deletePostMediaKeys([mediaS3Key])
    } catch (err) {
      console.error('[instagram-items/versions/delete] S3 DeleteObject failed', {
        userIdPrefix: userId.slice(0, 8),
        itemId: itemParsed.data,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ message: 'Failed to delete image from storage' }, { status: 502 })
    }

    return NextResponse.json({
      item: await withItemImageUrl(mutationData.deleteInstagramItemMediaVersion, userId),
    })
  } catch (error) {
    console.error(error)
    const message =
      error instanceof Error ? error.message : 'Failed to delete Instagram item media version'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
