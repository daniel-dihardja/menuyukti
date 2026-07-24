import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { deletePostMediaKeys, isObjectKeyForPost } from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_INSTAGRAM_ITEM_PAGE_MEDIA_VERSION_MUTATION,
  INSTAGRAM_ITEM_QUERY,
  type DeleteInstagramItemPageMediaVersionData,
  type InstagramItemData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

import {
  deleteInstagramItemPageMediaVersionBodySchema,
  itemIdParamSchema,
  pageIdParamSchema,
  workflowIdParamSchema,
} from '../../../../schema'
import { withItemImageUrl, withPageImageUrl } from '../../../../with-image-url'

type RouteContext = {
  params: Promise<{ id: string; itemId: string; pageId: string }>
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

    const { id: rawWorkflowId, itemId: rawItemId, pageId: rawPageId } = await context.params
    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const itemParsed = itemIdParamSchema.safeParse(rawItemId)
    const pageParsed = pageIdParamSchema.safeParse(rawPageId)
    if (!workflowParsed.success || !itemParsed.success || !pageParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow, item, or page id' }, { status: 400 })
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

    const parsedBody = deleteInstagramItemPageMediaVersionBodySchema.safeParse(body)
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

    const page = item.pages.find((candidate) => candidate.id === pageParsed.data)
    if (!page) {
      return NextResponse.json({ message: 'Instagram item page not found' }, { status: 404 })
    }

    const isKnownVersion = page.mediaVersions.some((version) => version.mediaS3Key === mediaS3Key)
    if (!isKnownVersion) {
      return NextResponse.json(
        { message: 'Media version not found for this page' },
        { status: 400 },
      )
    }

    const mutationData = await graphqlQuery<DeleteInstagramItemPageMediaVersionData>(
      DELETE_INSTAGRAM_ITEM_PAGE_MEDIA_VERSION_MUTATION,
      { pageId: pageParsed.data, mediaS3Key },
      userId,
    )

    try {
      await deletePostMediaKeys([mediaS3Key])
    } catch (err) {
      console.error('[instagram-items/pages/versions/delete] S3 DeleteObject failed', {
        userIdPrefix: userId.slice(0, 8),
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ message: 'Failed to delete image from storage' }, { status: 502 })
    }

    const refreshed = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )

    return NextResponse.json({
      page: await withPageImageUrl(mutationData.deleteInstagramItemPageMediaVersion, userId),
      item: refreshed.instagramItem
        ? await withItemImageUrl(refreshed.instagramItem, userId)
        : null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete Instagram item page media version'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ message }, { status: 500 })
  }
}
