import { NextResponse, connection } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  SUBMIT_MENU_ITEM_FEEDBACK_MUTATION,
  type SubmitMenuItemFeedbackData,
} from '@/lib/graphql/queries/menu-item-feedback'

const submitFeedbackSchema = z
  .object({
    locationId: z.number().int().positive(),
    menuItemId: z.number().int().positive(),
    sentiment: z.enum(['positive', 'negative']).optional().nullable(),
    body: z.string().trim().max(280).optional().nullable().default(''),
    guestDisplayName: z.string().trim().max(128).optional().nullable(),
    posOrderId: z.number().int().positive().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const body = (value.body ?? '').trim()
    if (value.sentiment === 'negative' && !body) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: 'A short note is required with a thumbs down',
      })
    }
    if (!value.sentiment && !body) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: 'Provide a thumbs rating or a short note',
      })
    }
  })

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const payload = submitFeedbackSchema.parse(json)

    let guestDisplayName = payload.guestDisplayName?.trim() || null
    if (!guestDisplayName) {
      const user = await currentUser()
      guestDisplayName =
        user?.firstName?.trim() ||
        user?.username?.trim() ||
        user?.primaryEmailAddress?.emailAddress?.split('@')[0]?.trim() ||
        null
    }

    const data = await graphqlQuery<SubmitMenuItemFeedbackData>(
      SUBMIT_MENU_ITEM_FEEDBACK_MUTATION,
      {
        locationId: payload.locationId,
        menuItemId: payload.menuItemId,
        sentiment:
          payload.sentiment === 'positive'
            ? 'POSITIVE'
            : payload.sentiment === 'negative'
              ? 'NEGATIVE'
              : null,
        body: payload.body ?? '',
        guestDisplayName,
        posOrderId: payload.posOrderId ?? null,
      },
      userId,
      'SubmitMenuItemFeedback',
    )

    const feedback = data.submitMenuItemFeedback
    return NextResponse.json(
      {
        id: feedback.id,
        status: feedback.status,
        menuItemId: feedback.menuItemId,
        posOrderId: feedback.posOrderId,
        sentiment: feedback.sentiment,
        body: feedback.body,
      },
      { status: 201 },
    )
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

    console.error('[public-menu/feedback] POST', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
