'use client'

import { useCallback, useState } from 'react'
import { parseAsString, useQueryState } from 'nuqs'
import { useTranslations } from 'next-intl'

import { useTimelineWorkspaceState } from '../timeline-context'
import { InstagramItemDetail } from './instagram-item-detail'
import { InstagramItemsOverview } from './instagram-items-overview'
import { useInstagramItems, type InstagramItemFormValues } from './use-instagram-items'

export function InstagramItemsArtifact() {
  const t = useTranslations('analytics.workflows.instagramItems')
  const { workflowId } = useTimelineWorkspaceState()
  const [selectedItemId, setSelectedItemId] = useQueryState('item', parseAsString)
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useInstagramItems(workflowId)

  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const selectedItem =
    selectedItemId !== null ? items.find((item) => item.id === selectedItemId) : undefined

  const handleCreate = useCallback(async () => {
    setCreating(true)
    setActionError(null)
    try {
      const created = await createItem('post')
      if (created) {
        await setSelectedItemId(created.id)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('createError'))
    } finally {
      setCreating(false)
    }
  }, [createItem, setSelectedItemId, t])

  const handleSave = useCallback(
    async (values: InstagramItemFormValues) => {
      if (!selectedItemId) return
      setSaving(true)
      setActionError(null)
      try {
        await updateItem(selectedItemId, values)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : t('saveError'))
      } finally {
        setSaving(false)
      }
    },
    [selectedItemId, t, updateItem],
  )

  const handleDeleteFromOverview = useCallback(
    async (itemId: string) => {
      setDeletingId(itemId)
      setActionError(null)
      try {
        await deleteItem(itemId)
        if (selectedItemId === itemId) {
          await setSelectedItemId(null)
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : t('deleteError'))
        throw err
      } finally {
        setDeletingId(null)
      }
    },
    [deleteItem, selectedItemId, setSelectedItemId, t],
  )

  if (selectedItem) {
    return (
      <InstagramItemDetail
        actionError={actionError}
        item={selectedItem}
        onBack={() => {
          void setSelectedItemId(null)
          setActionError(null)
        }}
        onSave={handleSave}
        saving={saving}
      />
    )
  }

  if (selectedItemId && !loading) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">{t('notFound')}</p>
        <InstagramItemsOverview
          creating={creating}
          deletingId={deletingId}
          error={actionError ?? error}
          items={items}
          loading={loading}
          onCreate={() => {
            void handleCreate()
          }}
          onDelete={handleDeleteFromOverview}
          onSelect={(itemId) => {
            void setSelectedItemId(itemId)
            setActionError(null)
          }}
        />
      </div>
    )
  }

  return (
    <InstagramItemsOverview
      creating={creating}
      deletingId={deletingId}
      error={actionError ?? error}
      items={items}
      loading={loading}
      onCreate={() => {
        void handleCreate()
      }}
      onDelete={handleDeleteFromOverview}
      onSelect={(itemId) => {
        void setSelectedItemId(itemId)
        setActionError(null)
      }}
    />
  )
}
