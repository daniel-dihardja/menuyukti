'use client'

import { createContext, use, type ReactNode } from 'react'

import { useWorkflowVisualizations } from './use-workflow-visualizations'
import type { WorkflowVisualizationId } from './workflow-visualization-catalog'

export type WorkflowVisualizationsContextValue = {
  addedIds: WorkflowVisualizationId[]
  addVisualization: (id: WorkflowVisualizationId) => void
  removeVisualization: (id: WorkflowVisualizationId) => void
  hydrated: boolean
}

const WorkflowVisualizationsContext = createContext<WorkflowVisualizationsContextValue | null>(null)

export function WorkflowVisualizationsProvider({
  workflowId,
  children,
}: {
  workflowId: string
  children: ReactNode
}) {
  const value = useWorkflowVisualizations(workflowId)
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
