'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { apiFetch } from '@/lib/api/client-fetch'

import type { PostListItem } from './posts-table-types'

function storedTitle(post: PostListItem): string {
  return post.title?.trim() ?? ''
}

type UsePostTitleEditOptions = {
  rows: PostListItem[]
  setRows: React.Dispatch<React.SetStateAction<PostListItem[]>>
}

export function usePostTitleEdit({ rows, setRows }: UsePostTitleEditOptions) {
  const router = useRouter()
  const t = useTranslations('posts.table')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const editContainerRef = useRef<HTMLDivElement>(null)

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setDraftTitle('')
    setRenameError(null)
  }, [])

  useEffect(() => {
    if (editingId === null) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelEdit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingId, cancelEdit])

  useEffect(() => {
    if (editingId === null) return
    const onPointerDown = (e: PointerEvent) => {
      if (saving) return
      const el = editContainerRef.current
      if (!el?.contains(e.target as Node)) {
        cancelEdit()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [editingId, saving, cancelEdit])

  const startEdit = useCallback((post: PostListItem) => {
    setEditingId(post.id)
    setDraftTitle(storedTitle(post))
    setRenameError(null)
  }, [])

  const saveEdit = useCallback(async () => {
    if (editingId === null || saving) return
    const trimmed = draftTitle.trim()
    if (!trimmed) return

    const row = rows.find((post) => post.id === editingId)
    if (row && trimmed === storedTitle(row)) {
      cancelEdit()
      return
    }

    setSaving(true)
    setRenameError(null)
    try {
      const result = await apiFetch<{ title?: string; updatedAt?: string | null }>(
        `/api/posts/${encodeURIComponent(editingId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmed }),
        },
        t('renameError'),
      )
      if (!result.ok) {
        setRenameError(result.error)
        return
      }
      const nextTitle = result.data.title ?? trimmed
      setRows((current) =>
        current.map((post) =>
          post.id === editingId
            ? {
                ...post,
                title: nextTitle,
                updatedAt: result.data.updatedAt ?? post.updatedAt,
              }
            : post,
        ),
      )
      cancelEdit()
      router.refresh()
    } catch {
      setRenameError(t('renameError'))
    } finally {
      setSaving(false)
    }
  }, [cancelEdit, draftTitle, editingId, rows, router, saving, setRows, t])

  const onDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void saveEdit()
      }
    },
    [saveEdit],
  )

  return {
    editingId,
    draftTitle,
    saving,
    renameError,
    editContainerRef,
    setDraftTitle,
    startEdit,
    saveEdit,
    onDraftKeyDown,
    editTitleAria: t('editTitleAria'),
    saveTitleAria: t('saveTitleAria'),
    titleLabel: t('title'),
    untitledLabel: t('untitled'),
  }
}
