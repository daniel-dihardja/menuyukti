'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  addVisualizationId,
  parseStoredVisualizationIds,
  removeVisualizationId,
  type WorkflowVisualizationId,
} from './workflow-visualization-catalog'

function storageKey(workflowId: string): string {
  return `workflow-visualizations:${workflowId}`
}

function readStored(workflowId: string): WorkflowVisualizationId[] {
  if (typeof window === 'undefined') return []
  try {
    return parseStoredVisualizationIds(localStorage.getItem(storageKey(workflowId)))
  } catch {
    return []
  }
}

export function useWorkflowVisualizations(workflowId: string) {
  const [addedIds, setAddedIds] = useState<WorkflowVisualizationId[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setAddedIds(readStored(workflowId))
    setHydrated(true)
  }, [workflowId])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey(workflowId), JSON.stringify(addedIds))
    } catch {
      /* ignore quota / private mode */
    }
  }, [addedIds, hydrated, workflowId])

  const addVisualization = useCallback((id: WorkflowVisualizationId) => {
    setAddedIds((prev) => addVisualizationId(prev, id))
  }, [])

  const removeVisualization = useCallback((id: WorkflowVisualizationId) => {
    setAddedIds((prev) => removeVisualizationId(prev, id))
  }, [])

  return { addedIds, addVisualization, removeVisualization, hydrated }
}
