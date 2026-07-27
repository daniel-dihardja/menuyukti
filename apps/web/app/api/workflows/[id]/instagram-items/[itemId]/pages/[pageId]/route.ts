import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_INSTAGRAM_ITEM_PAGE_MUTATION,
  INSTAGRAM_ITEM_QUERY,
  UPDATE_INSTAGRAM_ITEM_PAGE_MUTATION,
  type DeleteInstagramItemPageData,
  type InstagramItemData,
  type UpdateInstagramItemPageData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

import {
  isPostKeyAllowedForAccess,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'

import {
  itemIdParamSchema,
  pageIdParamSchema,
  patchInstagramItemPageBodySchema,
  workflowIdParamSchema,
} from '../../../schema'
import { withItemImageUrl, withPageImageUrl } from '../../../with-image-url'

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

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mediaAccess = await requireWorkspaceMediaAccess(userId, 'write')
    if (!mediaAccess.ok) return mediaAccess.response

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

    const parsedBody = patchInstagramItemPageBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { mediaS3Key, prompt } = parsedBody.data

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

    if (mediaS3Key !== undefined) {
      if (!isPostKeyAllowedForAccess(mediaAccess.access, mediaS3Key)) {
        return NextResponse.json({ message: 'Invalid media key' }, { status: 400 })
      }

      const isKnownVersion =
        page.mediaS3Key === mediaS3Key ||
        page.mediaVersions.some((version) => version.mediaS3Key === mediaS3Key)
      if (!isKnownVersion) {
        return NextResponse.json(
          { message: 'Media version not found for this page' },
          { status: 400 },
        )
      }
    }

    const updated = await graphqlQuery<UpdateInstagramItemPageData>(
      UPDATE_INSTAGRAM_ITEM_PAGE_MUTATION,
      {
        id: pageParsed.data,
        ...(mediaS3Key !== undefined ? { mediaS3Key } : {}),
        ...(prompt !== undefined ? { prompt } : {}),
      },
      userId,
    )

    const refreshed = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )

    return NextResponse.json({
      page: await withPageImageUrl(updated.updateInstagramItemPage, mediaAccess.access),
      item: refreshed.instagramItem
        ? await withItemImageUrl(refreshed.instagramItem, mediaAccess.access)
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update Instagram item page'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (message.includes('Invalid')) {
      return NextResponse.json({ message }, { status: 400 })
    }
    console.error(error)
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

    const mediaAccess = await requireWorkspaceMediaAccess(userId, 'write')
    if (!mediaAccess.ok) return mediaAccess.response

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

    if (item.pages.length <= 1) {
      return NextResponse.json(
        { message: 'Instagram item must keep at least one page' },
        { status: 400 },
      )
    }

    if (page.mediaS3Key || page.mediaVersions.length > 0) {
      return NextResponse.json(
        { message: 'Cannot delete a page that has generated images' },
        { status: 400 },
      )
    }

    await graphqlQuery<DeleteInstagramItemPageData>(
      DELETE_INSTAGRAM_ITEM_PAGE_MUTATION,
      { pageId: pageParsed.data },
      userId,
    )

    const refreshed = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )

    const remainingPages = (refreshed.instagramItem?.pages ?? [])
      .toSorted((a, b) => a.sortOrder - b.sortOrder)
      .map((candidate) => ({
        id: candidate.id,
        sortOrder: candidate.sortOrder,
      }))

    return NextResponse.json({
      pages: remainingPages,
      item: refreshed.instagramItem
        ? await withItemImageUrl(refreshed.instagramItem, mediaAccess.access)
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete Instagram item page'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (message.includes('at least one page') || message.includes('generated images')) {
      return NextResponse.json({ message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ message }, { status: 500 })
  }
}
