import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  REVOKE_CRM_DEVICE_MUTATION,
  type RevokeCrmDeviceData,
} from '@/lib/graphql/queries/crm-registrations'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ deviceId: string }>
}

export async function POST(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { deviceId } = await context.params
    if (!UUID_RE.test(deviceId)) {
      return NextResponse.json({ message: 'Invalid deviceId' }, { status: 400 })
    }

    const data = await graphqlQuery<RevokeCrmDeviceData>(
      REVOKE_CRM_DEVICE_MUTATION,
      { deviceId },
      userId,
    )

    return NextResponse.json({ device: data.revokeCrmDevice })
  } catch (error) {
    console.error('[crm/registrations/devices/revoke] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to revoke device'
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
