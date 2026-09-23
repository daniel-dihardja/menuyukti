import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import { PROVISION_WORKSPACE_MUTATION, type ProvisionWorkspaceData } from '@/lib/graphql/queries'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO } from '@/lib/workspace-plan'

const bodySchema = z.object({
  ownerClerkUserId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(256),
  plan: z.enum([WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO]).optional(),
})

export async function POST(req: Request) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

    const json = await req.json()
    const { ownerClerkUserId, name, plan } = bodySchema.parse(json)

    const data = await graphqlQuery<ProvisionWorkspaceData>(
      PROVISION_WORKSPACE_MUTATION,
      {
        ownerClerkUserId,
        name,
        plan: plan ?? WORKSPACE_PLAN_PRO,
      },
      authz.userId,
    )

    return NextResponse.json({
      id: data.provisionWorkspace.id,
      name: data.provisionWorkspace.name,
      ownerClerkUserId: data.provisionWorkspace.ownerClerkUserId,
      plan: data.provisionWorkspace.plan,
      createdAt: data.provisionWorkspace.createdAt,
    })
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to provision workspace')
  }
}
