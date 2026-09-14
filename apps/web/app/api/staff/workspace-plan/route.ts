import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO } from '@/lib/workspace-plan'

const UPDATE_WORKSPACE_PLAN_MUTATION = `
  mutation UpdateWorkspacePlan($workspaceId: ID!, $plan: String!) {
    updateWorkspacePlan(workspaceId: $workspaceId, plan: $plan) {
      id
      name
      plan
    }
  }
`

type UpdateWorkspacePlanData = {
  updateWorkspacePlan: {
    id: string
    name: string
    plan: string
  }
}

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  plan: z.enum([WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO]),
})

export async function PATCH(req: Request) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

    const json = await req.json()
    const { workspaceId, plan } = bodySchema.parse(json)

    const data = await graphqlQuery<UpdateWorkspacePlanData>(
      UPDATE_WORKSPACE_PLAN_MUTATION,
      { workspaceId, plan },
      authz.userId,
    )

    return NextResponse.json({
      id: data.updateWorkspacePlan.id,
      name: data.updateWorkspacePlan.name,
      plan: data.updateWorkspacePlan.plan,
    })
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to update workspace plan')
  }
}
