'use client'

import { useCallback, useEffect, useState } from 'react'

import type { InstagramItemDto } from '@/lib/graphql/queries/instagram-items'

export type InstagramItemKind = 'story' | 'post' | 'reel'
export type InstagramItemStatus = 'draft' | 'ready'

export type InstagramItemFormValues = {
  kind: InstagramItemKind
  title: string
  caption: string
  hook: string
  visualBrief: string
  status: InstagramItemStatus
}

type ListResponse = { items: InstagramItemDto[] }
type ItemResponse = { item: InstagramItemDto }

function isKind(value: string): value is InstagramItemKind {
  return value === 'story' || value === 'post' || value === 'reel'
}

function isStatus(value: string): value is InstagramItemStatus {
  return value === 'draft' || value === 'ready'
}

export function toFormValues(item: InstagramItemDto): InstagramItemFormValues {
  return {
    kind: isKind(item.kind) ? item.kind : 'post',
    title: item.title ?? '',
    caption: item.caption ?? '',
    hook: item.hook ?? '',
    visualBrief: item.visualBrief ?? '',
    status: isStatus(item.status) ? item.status : 'draft',
  }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json = (await res.json()) as { message?: string; error?: string }
    return json.message || json.error || fallback
  } catch {
    return fallback
  }
}

export function useInstagramItems(workflowId: string) {
  const [items, setItems] = useState<InstagramItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items`)
      if (!res.ok) {
        setError(await readErrorMessage(res, 'Failed to load Instagram items'))
        setItems([])
        return
      }
      const data = (await res.json()) as ListResponse
      setItems(data.items ?? [])
    } catch {
      setError('Failed to load Instagram items')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createItem = useCallback(
    async (kind: InstagramItemKind = 'post'): Promise<InstagramItemDto | null> => {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to create Instagram item'))
      }
      const data = (await res.json()) as ItemResponse
      await refresh()
      return data.item
    },
    [refresh, workflowId],
  )

  const updateItem = useCallback(
    async (itemId: string, values: InstagramItemFormValues): Promise<InstagramItemDto> => {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to update Instagram item'))
      }
      const data = (await res.json()) as ItemResponse
      await refresh()
      return data.item
    },
    [refresh, workflowId],
  )

  const deleteItem = useCallback(
    async (itemId: string): Promise<void> => {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items/${itemId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to delete Instagram item'))
      }
      await refresh()
    },
    [refresh, workflowId],
  )

  return {
    items,
    loading,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  }
}
