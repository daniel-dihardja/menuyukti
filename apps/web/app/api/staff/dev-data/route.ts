import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import { INGEST_DEV_DATA_MUTATION, type IngestDevDataData } from '@/lib/graphql/queries'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const DEV_DATA_SCOPES = ['inventar', 'analytics', 'all', 'clear-inventar'] as const

const bodySchema = z.object({
  targetClerkUserId: z.string().trim().min(1),
  scope: z.enum(DEV_DATA_SCOPES),
})

export async function POST(req: Request) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

    const json = await req.json()
    const { targetClerkUserId, scope } = bodySchema.parse(json)

    const data = await graphqlQuery<IngestDevDataData>(
      INGEST_DEV_DATA_MUTATION,
      { targetClerkUserId, scope },
      authz.userId,
    )

    return NextResponse.json(data.ingestDevData)
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to ingest mock seed data')
  }
}
