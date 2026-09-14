import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'
import { normalizeWorkspacePlan } from '@/lib/workspace-plan'

export async function GET() {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const data = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
    const ws = data.myWorkspace
    if (!ws) {
      return NextResponse.json({ plan: 'free', workspaceId: null })
    }

    return NextResponse.json({
      plan: normalizeWorkspacePlan(ws.plan),
      workspaceId: ws.id,
    })
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to load workspace plan')
  }
}
