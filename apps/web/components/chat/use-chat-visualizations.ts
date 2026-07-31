'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  addVisualizationId,
  parseStoredVisualizationIds,
  removeVisualizationId,
  type ChatVisualizationId,
} from '@/components/chat/visualizations/chat-visualization-catalog'

function storageKey(storageKeyId: string): string {
  return `chat-visualizations:v1:${storageKeyId}`
}

const LEGACY_STORAGE_KEY_PREFIX = 'chat-visualizations:'

function readStored(storageKeyId: string): ChatVisualizationId[] {
  if (typeof window === 'undefined') return []
  try {
    const versioned = localStorage.getItem(storageKey(storageKeyId))
    if (versioned !== null) {
      return parseStoredVisualizationIds(versioned)
    }
    const legacy = localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${storageKeyId}`)
    if (legacy === null) return []
    const parsed = parseStoredVisualizationIds(legacy)
    try {
      localStorage.setItem(storageKey(storageKeyId), JSON.stringify(parsed))
      localStorage.removeItem(`${LEGACY_STORAGE_KEY_PREFIX}${storageKeyId}`)
    } catch {
      /* ignore quota / private mode */
    }
    return parsed
  } catch {
    return []
  }
}

export function useChatVisualizations(storageKeyId: string) {
  const [addedIds, setAddedIds] = useState<ChatVisualizationId[]>([])
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

  const addVisualization = useCallback((id: ChatVisualizationId) => {
    setAddedIds((prev) => addVisualizationId(prev, id))
  }, [])

  const removeVisualization = useCallback((id: ChatVisualizationId) => {
    setAddedIds((prev) => removeVisualizationId(prev, id))
  }, [])

  return { addedIds, addVisualization, removeVisualization, hydrated }
}
