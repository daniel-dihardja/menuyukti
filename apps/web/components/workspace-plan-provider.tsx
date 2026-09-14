'use client'

import { createContext, use, useMemo, type ReactNode } from 'react'

import type { WorkspacePlan } from '@/lib/workspace-plan'

export type WorkspacePlanContextValue = {
  plan: WorkspacePlan
  isLoaded: true
  workspaceId: string | null
}

const WorkspacePlanContext = createContext<WorkspacePlanContextValue | null>(null)

type WorkspacePlanProviderProps = {
  children: ReactNode
  plan: WorkspacePlan
  workspaceId: string | null
}

/** Server-seeded plan so sidenav/route guards filter correctly on first paint. */
export function WorkspacePlanProvider({
  children,
  plan,
  workspaceId,
}: WorkspacePlanProviderProps) {
  const value = useMemo<WorkspacePlanContextValue>(
    () => ({ plan, isLoaded: true, workspaceId }),
    [plan, workspaceId],
  )

  return <WorkspacePlanContext value={value}>{children}</WorkspacePlanContext>
}

export function useWorkspacePlanContext(): WorkspacePlanContextValue {
  const value = use(WorkspacePlanContext)
  if (!value) {
    throw new Error('useWorkspacePlanContext must be used within WorkspacePlanProvider')
  }
  return value
}
