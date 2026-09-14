'use client'

import { useWorkspacePlanContext } from '@/components/workspace-plan-provider'
import type { WorkspacePlan } from '@/lib/workspace-plan'

type WorkspacePlanState = {
  plan: WorkspacePlan
  isLoaded: boolean
  workspaceId: string | null
}

/**
 * Workspace product plan for nav and route gating.
 * Prefer server-seeded `WorkspacePlanProvider` (no client fetch flash).
 */
export function useWorkspacePlan(): WorkspacePlanState {
  return useWorkspacePlanContext()
}
