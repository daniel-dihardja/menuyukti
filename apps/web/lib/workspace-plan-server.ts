import { cache } from 'react'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries/locations'
import {
  getDefaultPathForPlan,
  normalizeWorkspacePlan,
  type WorkspacePlan,
} from '@/lib/workspace-plan'

export type ResolvedWorkspacePlan = {
  plan: WorkspacePlan
  /** True when the user has no workspace yet (treat as free until first create). */
  hasWorkspace: boolean
  workspaceId: string | null
}

/** Per-request workspace plan for the signed-in user. */
export const getWorkspacePlanForUser = cache(async (): Promise<ResolvedWorkspacePlan> => {
  const { userId } = await auth()
  if (!userId) {
    return { plan: 'free', hasWorkspace: false, workspaceId: null }
  }
  try {
    const data = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
    const ws = data.myWorkspace
    if (!ws) {
      return { plan: 'free', hasWorkspace: false, workspaceId: null }
    }
    return {
      plan: normalizeWorkspacePlan(ws.plan),
      hasWorkspace: true,
      workspaceId: ws.id,
    }
  } catch {
    // Fail open to free guards rather than granting pro on GraphQL errors.
    return { plan: 'free', hasWorkspace: false, workspaceId: null }
  }
})

export async function getAuthenticatedHomePath(): Promise<string> {
  const { plan } = await getWorkspacePlanForUser()
  return getDefaultPathForPlan(plan)
}
