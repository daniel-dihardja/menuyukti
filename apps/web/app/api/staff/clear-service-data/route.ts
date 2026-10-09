import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CLEAR_WORKSPACE_SERVICE_DATA_MUTATION,
  type ClearWorkspaceServiceDataData,
} from '@/lib/graphql/queries'
import { SERVICE_KEYS } from '@/lib/graphql/queries/service-subscriptions'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const bodySchema = z.object({
  targetClerkUserId: z.string().trim().min(1),
  serviceKey: z.enum(SERVICE_KEYS),
})

export async function POST(req: Request) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

    const json = await req.json()
    const { targetClerkUserId, serviceKey } = bodySchema.parse(json)

    const data = await graphqlQuery<ClearWorkspaceServiceDataData>(
      CLEAR_WORKSPACE_SERVICE_DATA_MUTATION,
      { targetClerkUserId, serviceKey },
      authz.userId,
    )

    return NextResponse.json(data.clearWorkspaceServiceData)
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to clear service data')
  }
}
