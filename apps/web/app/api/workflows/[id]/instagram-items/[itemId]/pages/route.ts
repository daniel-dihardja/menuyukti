import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { copyPostMediaKey, isObjectKeyForPost } from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_INSTAGRAM_ITEM_PAGE_MUTATION,
  INSTAGRAM_ITEM_QUERY,
  type CreateInstagramItemPageData,
  type InstagramItemData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

import {
  MAX_INSTAGRAM_ITEM_PAGES,
  createInstagramItemPageBodySchema,
  itemIdParamSchema,
  workflowIdParamSchema,
} from '../../schema'
import { withItemImageUrl, withPageImageUrl } from '../../with-image-url'

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

export async function POST(req: Request, context: RouteContext) {
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
      body = {}
    }

    const parsedBody = createInstagramItemPageBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
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

    if (item.pages.length >= MAX_INSTAGRAM_ITEM_PAGES) {
      return NextResponse.json(
        { message: 'Instagram items support up to 10 pages.' },
        { status: 400 },
      )
    }

    const sortedPages = item.pages.toSorted((a, b) => a.sortOrder - b.sortOrder)
    const copyFromPageId = parsedBody.data.copyFromPageId
    const sourcePage = copyFromPageId
      ? sortedPages.find((page) => page.id === copyFromPageId)
      : undefined

    if (copyFromPageId && !sourcePage) {
      return NextResponse.json({ message: 'Source page not found' }, { status: 404 })
    }

    let mediaS3Key: string | undefined
    let prompt: string | undefined

    if (sourcePage) {
      if (sourcePage.mediaS3Key && isObjectKeyForPost(sourcePage.mediaS3Key, userId)) {
        try {
          mediaS3Key = await copyPostMediaKey(sourcePage.mediaS3Key, userId)
        } catch (err) {
          console.error('[instagram-items/pages/create] S3 copy failed', {
            userIdPrefix: userId.slice(0, 8),
            message: err instanceof Error ? err.message : String(err),
          })
          return NextResponse.json({ message: 'Failed to copy page image' }, { status: 502 })
        }
      }
      if (sourcePage.prompt) {
        prompt = sourcePage.prompt
      }
    }

    const mutationData = await graphqlQuery<CreateInstagramItemPageData>(
      CREATE_INSTAGRAM_ITEM_PAGE_MUTATION,
      {
        itemId: itemParsed.data,
        mediaS3Key,
        prompt,
      },
      userId,
    )

    const createdPage = await withPageImageUrl(mutationData.createInstagramItemPage, userId)
    const refreshed = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )

    return NextResponse.json(
      {
        page: createdPage,
        item: refreshed.instagramItem
          ? await withItemImageUrl(refreshed.instagramItem, userId)
          : null,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Instagram item page'
    if (message.includes('maximum number of pages')) {
      return NextResponse.json(
        { message: 'Instagram items support up to 10 pages.' },
        { status: 400 },
      )
    }
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
