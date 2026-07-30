'use client'

import { createContext, use, type ReactNode } from 'react'

import { useWorkflowVisualizations } from './use-workflow-visualizations'
import type { WorkflowVisualizationId } from './workflow-visualization-catalog'

export type WorkflowVisualizationsContextValue = {
  addedIds: WorkflowVisualizationId[]
  addVisualization: (id: WorkflowVisualizationId) => void
  removeVisualization: (id: WorkflowVisualizationId) => void
  hydrated: boolean
  locationId: number
  analyticsRunId: number | null
}

const WorkflowVisualizationsContext = createContext<WorkflowVisualizationsContextValue | null>(null)

export function WorkflowVisualizationsProvider({
  storageKeyId,
  locationId,
  analyticsRunId,
  children,
}: {
  /** Persistence key (agentThreadId or legacy workflowId). */
  storageKeyId: string
  locationId: number
  analyticsRunId: number | null
  children: ReactNode
}) {
  const visualizations = useWorkflowVisualizations(storageKeyId)
  const value: WorkflowVisualizationsContextValue = {
    ...visualizations,
    locationId,
    analyticsRunId,
  }
  return <WorkflowVisualizationsContext value={value}>{children}</WorkflowVisualizationsContext>
}

export function useWorkflowVisualizationsState(): WorkflowVisualizationsContextValue {
  const ctx = use(WorkflowVisualizationsContext)
  if (!ctx) {
    throw new Error(
      'useWorkflowVisualizationsState must be used within WorkflowVisualizationsProvider',
    )
  }
  return ctx
}
