import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_CRM_CUSTOMER_MUTATION,
  type DeleteCrmCustomerData,
} from '@/lib/graphql/queries/crm-registrations'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id } = await context.params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteCrmCustomerData>(
      DELETE_CRM_CUSTOMER_MUTATION,
      { id },
      userId,
    )

    return NextResponse.json({ ok: data.deleteCrmCustomer })
  } catch (error) {
    console.error('[crm/registrations] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete registration'
    const lower = message.toLowerCase()
    if (lower.includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (lower.includes('not allowed') || lower.includes('permission')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
