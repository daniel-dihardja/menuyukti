import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import { DEFAULT_LIST_FIRST } from '@/lib/graphql/pagination'
import { CRM_CUSTOMERS_QUERY, type CrmCustomersData } from '@/lib/graphql/queries/crm-registrations'

export async function GET(req: Request) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { searchParams } = new URL(req.url)
    const appIdRaw = searchParams.get('appId')
    const appId = appIdRaw ? Number(appIdRaw) : NaN
    if (!Number.isInteger(appId) || appId < 1) {
      return NextResponse.json({ message: 'appId is required' }, { status: 400 })
    }

    const search = searchParams.get('search')?.trim() || undefined
    const data = await graphqlQuery<CrmCustomersData>(
      CRM_CUSTOMERS_QUERY,
      { appId, first: DEFAULT_LIST_FIRST, ...(search ? { search } : {}) },
      userId,
    )

    return NextResponse.json({ customers: data.crmCustomers })
  } catch (error) {
    console.error('[crm/registrations] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to list registrations'
    return NextResponse.json({ message }, { status: 500 })
  }
}
