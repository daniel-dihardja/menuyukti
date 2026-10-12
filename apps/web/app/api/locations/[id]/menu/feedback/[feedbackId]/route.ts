import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  HIDE_MENU_ITEM_FEEDBACK_MUTATION,
  PUBLISH_MENU_ITEM_FEEDBACK_MUTATION,
  REPLY_MENU_ITEM_FEEDBACK_MUTATION,
  type HideMenuItemFeedbackData,
  type PublishMenuItemFeedbackData,
  type ReplyMenuItemFeedbackData,
} from '@/lib/graphql/queries/menu-item-feedback'

type RouteContext = {
  params: Promise<{ id: string; feedbackId: string }>
}

function parsePositiveInt(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reply'),
    reply: z.string().trim().min(1).max(500),
  }),
  z.object({
    action: z.literal('publish'),
  }),
  z.object({
    action: z.literal('hide'),
  }),
])

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, feedbackId: feedbackIdParam } = await context.params
    const locId = parsePositiveInt(id)
    const feedbackId = parsePositiveInt(feedbackIdParam)
    if (!locId || !feedbackId) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const json = await req.json()
    const payload = patchSchema.parse(json)

    if (payload.action === 'reply') {
      const data = await graphqlQuery<ReplyMenuItemFeedbackData>(
        REPLY_MENU_ITEM_FEEDBACK_MUTATION,
        { feedbackId, reply: payload.reply },
        userId,
        'ReplyMenuItemFeedback',
      )
      return NextResponse.json(data.replyMenuItemFeedback, { status: 200 })
    }

    if (payload.action === 'publish') {
      const data = await graphqlQuery<PublishMenuItemFeedbackData>(
        PUBLISH_MENU_ITEM_FEEDBACK_MUTATION,
        { feedbackId },
        userId,
        'PublishMenuItemFeedback',
      )
      return NextResponse.json(data.publishMenuItemFeedback, { status: 200 })
    }

    const data = await graphqlQuery<HideMenuItemFeedbackData>(
      HIDE_MENU_ITEM_FEEDBACK_MUTATION,
      { feedbackId },
      userId,
      'HideMenuItemFeedback',
    )
    return NextResponse.json(data.hideMenuItemFeedback, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: 'Invalid input',
          issues: error.issues,
        },
        { status: 400 },
      )
    }

    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    console.error('[locations/menu/feedback/id] PATCH', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
