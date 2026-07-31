'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'menuyukti:chatPreview:v1'
const LEGACY_STORAGE_KEY = 'menuyukti:workflowPreview:v1'

function readLocalStorage(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore quota / private mode */
  }
  return null
}

function previewOpenFromQuery(queryPreview: '0' | '1' | null): boolean | null {
  if (queryPreview === '0') return false
  if (queryPreview === '1') return true
  return null
}

export function useChatPreviewVisibility() {
  const [queryPreview, setQueryPreview] = useQueryState(
    'preview',
    parseAsStringLiteral(['0', '1'] as const),
  )
  const fromQuery = previewOpenFromQuery(queryPreview)
  const [localPreviewOpen, setLocalPreviewOpen] = useState(true)

  // Only hydrate from localStorage when the URL does not already decide.
  useEffect(() => {
    if (fromQuery !== null) return
    setLocalPreviewOpen(readLocalStorage() ?? true)
  }, [fromQuery])

  const previewOpen = fromQuery ?? localPreviewOpen

  const setPreviewOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved =
        typeof next === 'function' ? (next as (p: boolean) => boolean)(previewOpen) : next
      setLocalPreviewOpen(resolved)
      // Avoid setQueryPreview (nuqs) during render — queue so ancestors update after commit.
      queueMicrotask(() => {
        try {
          localStorage.setItem(STORAGE_KEY, resolved ? '1' : '0')
        } catch {
          /* ignore */
        }
        void setQueryPreview(resolved ? '1' : '0')
      })
    },
    [previewOpen, setQueryPreview],
  )

  return { previewOpen, setPreviewOpen }
}
