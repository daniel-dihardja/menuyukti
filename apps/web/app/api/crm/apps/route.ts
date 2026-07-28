import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_CRM_APP_MUTATION,
  CRM_APPS_QUERY,
  type CreateCrmAppData,
  type CrmAppsData,
} from '@/lib/graphql/queries/crm-apps'

import { createCrmAppBodySchema } from './schema'

export async function GET() {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const data = await graphqlQuery<CrmAppsData>(CRM_APPS_QUERY, {}, userId)

    return NextResponse.json({ apps: data.crmApps })
  } catch (error) {
    console.error('[crm/apps] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to list CRM apps'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = createCrmAppBodySchema.parse(json)

    const data = await graphqlQuery<CreateCrmAppData>(
      CREATE_CRM_APP_MUTATION,
      { title: body.title },
      userId,
    )

    return NextResponse.json({ app: data.createCrmApp }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[crm/apps] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create CRM app'
    const status = message.includes('No workspace') ? 400 : 500
    return NextResponse.json({ message }, { status })
  }
}
