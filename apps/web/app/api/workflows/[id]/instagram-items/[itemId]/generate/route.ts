import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  INSTAGRAM_ITEM_QUERY,
  UPDATE_INSTAGRAM_ITEM_MUTATION,
  UPDATE_INSTAGRAM_ITEM_PAGE_MUTATION,
  type InstagramItemData,
  type UpdateInstagramItemData,
  type UpdateInstagramItemPageData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'
import {
  DEFAULT_POST_IMAGE_QUALITY,
  kindToPostImageFormat,
  POST_IMAGE_QUALITY_IDS,
} from '@/lib/posts/leonardo-post-dimensions'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'
import {
  generationReferenceSchema,
  runInstagramImageGeneration,
} from '@/lib/posts/run-instagram-image-generation'

import { requireWorkspaceMediaAccess } from '@/lib/assets/workspace-media-access'

import {
  itemIdParamSchema,
  pageIdParamSchema,
  referenceImageSchema,
  workflowIdParamSchema,
} from '../../schema'
import { withItemImageUrl } from '../../with-image-url'

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

const bodySchema = z.object({
  pageId: pageIdParamSchema,
  prompt: z.string().trim().min(1).max(3000),
  references: z.array(generationReferenceSchema).max(MAX_GENERATION_REFERENCES).optional(),
  /** Full attached set to persist (enabled + disabled), not only generation refs. */
  referenceImages: z.array(referenceImageSchema).max(5).optional(),
  model: z.enum(LEONARDO_POST_MODEL_IDS).optional(),
  quality: z.enum(POST_IMAGE_QUALITY_IDS).optional(),
  /** Omit = leave unchanged; null = clear; positive int = set. */
  styleId: z.number().int().positive().nullable().optional(),
})

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

    const mediaAccess = await requireWorkspaceMediaAccess(userId, 'write')
    if (!mediaAccess.ok) return mediaAccess.response

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

    let json: unknown
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid body' }, { status: 400 })
    }

    const existing = await graphqlQuery<InstagramItemData>(
      INSTAGRAM_ITEM_QUERY,
      { id: itemParsed.data },
      userId,
    )
    const current = existing.instagramItem
    if (!current || current.workflowId !== workflowParsed.data) {
      return NextResponse.json({ message: 'Instagram item not found' }, { status: 404 })
    }

    const page = current.pages.find((candidate) => candidate.id === parsed.data.pageId)
    if (!page) {
      return NextResponse.json({ message: 'Instagram item page not found' }, { status: 404 })
    }

    const {
      pageId,
      prompt,
      references = [],
      referenceImages,
      model = DEFAULT_LEONARDO_POST_MODEL,
      quality = DEFAULT_POST_IMAGE_QUALITY,
      styleId,
    } = parsed.data
    const format = kindToPostImageFormat(current.kind)

    const result = await runInstagramImageGeneration({
      userId,
      prompt,
      references,
      model,
      format,
      quality,
      ...(styleId != null ? { styleId } : {}),
      logPrefix: '[instagram-items/generate]',
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.error.message,
          ...(result.error.code ? { code: result.error.code } : {}),
        },
        { status: result.error.status },
      )
    }

    try {
      await graphqlQuery<UpdateInstagramItemPageData>(
        UPDATE_INSTAGRAM_ITEM_PAGE_MUTATION,
        {
          id: pageId,
          mediaS3Key: result.data.mediaS3Key,
          prompt,
        },
        userId,
      )
    } catch (err) {
      console.error('[instagram-items/generate] updateInstagramItemPage failed', {
        userIdPrefix: userId.slice(0, 8),
        itemId: itemParsed.data,
        pageId,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json(
        { message: 'Failed to save image to Instagram item page' },
        { status: 502 },
      )
    }

    let updatedItem: UpdateInstagramItemData['updateInstagramItem']
    try {
      const updated = await graphqlQuery<UpdateInstagramItemData>(
        UPDATE_INSTAGRAM_ITEM_MUTATION,
        {
          id: itemParsed.data,
          visualBrief: prompt,
          generationPrompt: prompt,
          ...(referenceImages !== undefined ? { referenceImages } : {}),
          ...(styleId !== undefined ? { styleId } : {}),
        },
        userId,
      )
      updatedItem = updated.updateInstagramItem
    } catch (err) {
      console.error('[instagram-items/generate] updateInstagramItem failed', {
        userIdPrefix: userId.slice(0, 8),
        itemId: itemParsed.data,
        message: err instanceof Error ? err.message : String(err),
      })
      // Page media was saved; reload item so the client still gets the new image.
      const reloaded = await graphqlQuery<InstagramItemData>(
        INSTAGRAM_ITEM_QUERY,
        { id: itemParsed.data },
        userId,
      )
      if (!reloaded.instagramItem) {
        return NextResponse.json(
          { message: 'Failed to save Instagram item metadata' },
          { status: 502 },
        )
      }
      updatedItem = reloaded.instagramItem
    }

    const item = await withItemImageUrl(updatedItem, mediaAccess.access)

    return NextResponse.json({
      url: result.data.url,
      name: result.data.name,
      mediaS3Key: result.data.mediaS3Key,
      size: result.data.size,
      createdAt: result.data.createdAt,
      pageId,
      item,
    })
  } catch (error) {
    console.error(error)
    const message =
      error instanceof Error ? error.message : 'Failed to generate Instagram item image'
    return NextResponse.json({ message }, { status: 500 })
  }
}
