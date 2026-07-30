'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  addVisualizationId,
  parseStoredVisualizationIds,
  removeVisualizationId,
  type WorkflowVisualizationId,
} from './workflow-visualization-catalog'

function storageKey(storageKeyId: string): string {
  return `chat-visualizations:${storageKeyId}`
}

function readStored(storageKeyId: string): WorkflowVisualizationId[] {
  if (typeof window === 'undefined') return []
  try {
    return parseStoredVisualizationIds(localStorage.getItem(storageKey(storageKeyId)))
  } catch {
    return []
  }
}

export function useWorkflowVisualizations(storageKeyId: string) {
  const [addedIds, setAddedIds] = useState<WorkflowVisualizationId[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setAddedIds(readStored(storageKeyId))
    setHydrated(true)
  }, [storageKeyId])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey(storageKeyId), JSON.stringify(addedIds))
    } catch {
      /* ignore quota / private mode */
    }
  }, [addedIds, hydrated, storageKeyId])

  const addVisualization = useCallback((id: WorkflowVisualizationId) => {
    setAddedIds((prev) => addVisualizationId(prev, id))
  }, [])

  const removeVisualization = useCallback((id: WorkflowVisualizationId) => {
    setAddedIds((prev) => removeVisualizationId(prev, id))
  }, [])

  return { addedIds, addVisualization, removeVisualization, hydrated }
}
