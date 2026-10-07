import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  POINT_EARN_ACTION_COMPLETE_ORDER,
  POINT_EARN_ACTION_OPEN_MENU_QR,
  POINT_EARN_RULES_QUERY,
  UPSERT_POINT_EARN_RULES_MUTATION,
  type PointEarnRulesData,
  type UpsertPointEarnRulesData,
} from '@/lib/graphql/queries/point-earn-rules'

const actionKeySchema = z.enum([POINT_EARN_ACTION_OPEN_MENU_QR, POINT_EARN_ACTION_COMPLETE_ORDER])

const ruleSchema = z.object({
  actionKey: actionKeySchema,
  points: z.number().int().min(0),
  enabled: z.boolean(),
})

const putBodySchema = z.object({
  locationId: z.number().int().positive(),
  rules: z.array(ruleSchema).min(1),
})

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationIdRaw = new URL(req.url).searchParams.get('locationId')
    const locationId = Number(locationIdRaw)
    if (!Number.isInteger(locationId) || locationId < 1) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }

    const data = await graphqlQuery<PointEarnRulesData>(
      POINT_EARN_RULES_QUERY,
      { locationId },
      userId,
      'PointEarnRules',
    )

    return NextResponse.json({ rules: data.pointEarnRules }, { status: 200 })
  } catch (error) {
    console.error('[services/point-system/rules] GET', error)
    return apiErrorFromUnknown(error, 'Failed to load point earn rules')
  }
}

export async function PUT(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId, rules } = putBodySchema.parse(await req.json())
    const data = await graphqlQuery<UpsertPointEarnRulesData>(
      UPSERT_POINT_EARN_RULES_MUTATION,
      { locationId, rules },
      userId,
      'UpsertPointEarnRules',
    )

    return NextResponse.json({ rules: data.upsertPointEarnRules }, { status: 200 })
  } catch (error) {
    console.error('[services/point-system/rules] PUT', error)
    return apiErrorFromUnknown(error, 'Failed to save point earn rules')
  }
}
