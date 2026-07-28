import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  AWARD_CRM_CASHBACK_MUTATION,
  type AwardCrmCashbackData,
} from '@/lib/graphql/queries/crm-registrations'

import { awardCrmCashbackBodySchema } from './schema'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string }>
}

function mapAwardError(message: string): { message: string; status: number } {
  const lower = message.toLowerCase()
  if (lower.includes('not found')) {
    return { message, status: 404 }
  }
  if (lower.includes('not allowed') || lower.includes('permission')) {
    return { message, status: 403 }
  }
  if (
    lower.includes('amount must be') ||
    lower.includes('label must be at most') ||
    lower.includes('missing authenticated')
  ) {
    return { message, status: 400 }
  }
  return { message, status: 500 }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id } = await context.params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const json = await req.json()
    const body = awardCrmCashbackBodySchema.parse(json)
    const label = body.label?.trim() ? body.label.trim() : null

    const data = await graphqlQuery<AwardCrmCashbackData>(
      AWARD_CRM_CASHBACK_MUTATION,
      {
        customerId: id,
        amount: body.amount,
        label,
      },
      userId,
    )

    return NextResponse.json({ entry: data.awardCrmCashback })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[crm/registrations/cashback] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to award cashback'
    const mapped = mapAwardError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
