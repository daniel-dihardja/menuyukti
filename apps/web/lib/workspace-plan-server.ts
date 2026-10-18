import { cache } from 'react'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  ENSURE_MY_WORKSPACE_MUTATION,
  MY_WORKSPACE_QUERY,
  type EnsureMyWorkspaceData,
  type MyWorkspaceData,
} from '@/lib/graphql/queries/locations'
import {
  getDefaultPathForPlan,
  normalizeWorkspacePlan,
  type WorkspacePlan,
} from '@/lib/workspace-plan'

export type ResolvedWorkspacePlan = {
  plan: WorkspacePlan
  /** True when the user has a workspace (ensured on first resolve when missing). */
  hasWorkspace: boolean
  workspaceId: string | null
}

type WorkspaceFields = {
  id: string
  plan: string
}

async function ensureWorkspaceForUser(userId: string): Promise<WorkspaceFields | null> {
  try {
    const data = await graphqlQuery<EnsureMyWorkspaceData>(
      ENSURE_MY_WORKSPACE_MUTATION,
      {},
      userId,
      'EnsureMyWorkspace',
    )
    const ws = data.ensureMyWorkspace
    if (!ws?.id) return null
    return { id: ws.id, plan: ws.plan }
  } catch (error) {
    console.error('[workspace-plan] ensureMyWorkspace failed', error)
    return null
  }
}

/** Per-request workspace plan for the signed-in user. Ensures a default workspace when missing. */
export const getWorkspacePlanForUser = cache(async (): Promise<ResolvedWorkspacePlan> => {
  const { userId } = await auth()
  if (!userId) {
    return { plan: 'free', hasWorkspace: false, workspaceId: null }
  }
  try {
    const data = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
    let ws: WorkspaceFields | null = data.myWorkspace
      ? { id: data.myWorkspace.id, plan: data.myWorkspace.plan }
      : null
    if (!ws) {
      ws = await ensureWorkspaceForUser(userId)
    }
    if (!ws) {
      return { plan: 'free', hasWorkspace: false, workspaceId: null }
    }
    return {
      plan: normalizeWorkspacePlan(ws.plan),
      hasWorkspace: true,
      workspaceId: ws.id,
    }
  } catch {
    return { plan: 'free', hasWorkspace: false, workspaceId: null }
  }
})

/** Post-auth home — constant `/home` (no GraphQL; workspace ensure runs on layout). */
export async function getAuthenticatedHomePath(): Promise<string> {
  return getDefaultPathForPlan()
}
