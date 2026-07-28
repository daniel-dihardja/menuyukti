import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CRM_APP_QUERY,
  DELETE_CRM_APP_MUTATION,
  UPDATE_CRM_APP_MUTATION,
  type CrmAppData,
  type DeleteCrmAppData,
  type UpdateCrmAppData,
} from '@/lib/graphql/queries/crm-apps'

import { updateCrmAppBodySchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseAppId(rawId: string): number | null {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

function mapCrmAppError(message: string): { message: string; status: number } {
  const lower = message.toLowerCase()
  if (lower.includes('not found')) {
    return { message, status: 404 }
  }
  if (lower.includes('not allowed') || lower.includes('permission')) {
    return { message, status: 403 }
  }
  if (lower.includes('title is required') || lower.includes('at most 256')) {
    return { message, status: 400 }
  }
  return { message, status: 500 }
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseAppId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const data = await graphqlQuery<CrmAppData>(CRM_APP_QUERY, { id }, userId)
    if (!data.crmApp) {
      return NextResponse.json({ message: 'CRM app not found' }, { status: 404 })
    }

    return NextResponse.json({ app: data.crmApp })
  } catch (error) {
    console.error('[crm/apps] GET one', error)
    const message = error instanceof Error ? error.message : 'Failed to load CRM app'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseAppId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const json = await req.json()
    const body = updateCrmAppBodySchema.parse(json)

    const data = await graphqlQuery<UpdateCrmAppData>(
      UPDATE_CRM_APP_MUTATION,
      { id, title: body.title },
      userId,
    )

    return NextResponse.json({ app: data.updateCrmApp })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[crm/apps] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update CRM app'
    const mapped = mapCrmAppError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseAppId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteCrmAppData>(DELETE_CRM_APP_MUTATION, { id }, userId)

    return NextResponse.json({ ok: data.deleteCrmApp })
  } catch (error) {
    console.error('[crm/apps] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete CRM app'
    const mapped = mapCrmAppError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
