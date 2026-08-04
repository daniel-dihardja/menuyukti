'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { touchAgentThread } from '@/lib/chat/agent-thread-registry'

export function useAgentThreadTitleEdit() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const editContainerRef = useRef<HTMLDivElement>(null)

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setDraftTitle('')
  }, [])

  useEffect(() => {
    if (editingId === null) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingId, cancelEdit])

  useEffect(() => {
    if (editingId === null) return
    const onPointerDown = (e: PointerEvent) => {
      const el = editContainerRef.current
      if (!el?.contains(e.target as Node)) cancelEdit()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [editingId, cancelEdit])

  const startEdit = useCallback((threadId: string, currentTitle: string | null | undefined) => {
    setEditingId(threadId)
    setDraftTitle(currentTitle?.trim() ?? '')
  }, [])

  const saveEdit = useCallback(
    (currentStoredTitle: string | null | undefined): string | null | undefined => {
      if (editingId === null) return currentStoredTitle
      const trimmed = draftTitle.trim()
      const previous = currentStoredTitle?.trim() ?? ''
      if (trimmed === previous) {
        cancelEdit()
        return currentStoredTitle
      }
      const nextTitle = trimmed || null
      touchAgentThread(editingId, { title: nextTitle })
      cancelEdit()
      return nextTitle
    },
    [cancelEdit, draftTitle, editingId],
  )

  const onDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, currentStoredTitle: string | null | undefined) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        saveEdit(currentStoredTitle)
      }
    },
    [saveEdit],
  )

  const setDraftTitleValue = useCallback((value: string) => {
    setDraftTitle(value)
  }, [])

  return {
    editingId,
    draftTitle,
    editContainerRef,
    cancelEdit,
    startEdit,
    saveEdit,
    onDraftKeyDown,
    setDraftTitle: setDraftTitleValue,
  }
}
