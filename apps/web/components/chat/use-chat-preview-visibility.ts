'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'menuyukti:workflowPreview:v1'

function readLocalStorage(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore quota / private mode */
  }
  return null
}

export function useChatPreviewVisibility() {
  const [queryPreview, setQueryPreview] = useQueryState(
    'preview',
    parseAsStringLiteral(['0', '1'] as const),
  )
  const [previewOpen, setPreviewOpenState] = useState(true)

  useEffect(() => {
    let open = true
    if (queryPreview === '0') {
      open = false
    } else if (queryPreview === '1') {
      open = true
    } else {
      open = readLocalStorage() ?? true
    }
    setPreviewOpenState(open)
  }, [queryPreview])

  const setPreviewOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setPreviewOpenState((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: boolean) => boolean)(prev) : next
        // Avoid setQueryPreview (nuqs) inside this updater — it updates an ancestor during the same
        // commit as this component and triggers "Cannot update a component while rendering a different component".
        queueMicrotask(() => {
          try {
            localStorage.setItem(STORAGE_KEY, resolved ? '1' : '0')
          } catch {
            /* ignore */
          }
          void setQueryPreview(resolved ? '1' : '0')
        })
        return resolved
      })
    },
    [setQueryPreview],
  )

  return { previewOpen, setPreviewOpen }
}
