import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import { DELETE_CRM_APP_MUTATION, type DeleteCrmAppData } from '@/lib/graphql/queries/crm-apps'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteCrmAppData>(DELETE_CRM_APP_MUTATION, { id }, userId)

    return NextResponse.json({ ok: data.deleteCrmApp })
  } catch (error) {
    console.error('[crm/apps] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete CRM app'
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
