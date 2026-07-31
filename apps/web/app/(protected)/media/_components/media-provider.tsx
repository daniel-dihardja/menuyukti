'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ContentCatalogItem } from '@/app/(protected)/content/_components/content-catalog-types'
import {
  addMediaToCollection,
  createMediaCollection,
  deleteMediaCollection,
  listMediaCollections,
  loadMedia,
  removeMediaFromCollection,
  updateMediaCollection,
  type MediaCatalogItem,
  type MediaCollection,
} from '@/lib/media/client-api'

import {
  MediaContextProvider,
  type CollectionFilter,
  type MediaActions,
  type MediaState,
} from './media-context'

export function MediaProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('media')
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaCatalogItem[]>([])
  const [collections, setCollections] = useState<MediaCollection[]>([])
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [collectionsBusy, setCollectionsBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)
  const [imageDimensionsByName, setImageDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [preview, setPreview] = useState<ContentCatalogItem | null>(null)
  const [selected, setSelected] = useState<MediaCatalogItem | null>(null)
  const [addCollectionId, setAddCollectionId] = useState('')
  const [organizeBarHeight, setOrganizeBarHeight] = useState(0)

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    if (kind === 'success') toast.success(message)
    else toast.error(message)
  }, [])

  const refreshCollections = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const list = await listMediaCollections()
        if (signal?.aborted) return
        setCollections(list)
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return
        showToast('error', t('toast.collectionsLoadError'))
      }
    },
    [showToast, t],
  )

  const load = useCallback(
    async (silent = false, signal?: AbortSignal, filter: CollectionFilter = collectionFilter) => {
      if (!silent) setLoading(true)
      try {
        const list = await loadMedia({
          signal,
          ...(filter === 'all' ? {} : { collectionId: filter }),
        })
        if (signal?.aborted) return
        setItems(list)
        setLoadError(false)
        setSelected((prev) => {
          if (!prev) return null
          return list.find((item) => item.name === prev.name) ?? null
        })
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        setLoadError(true)
        setItems([])
        showToast('error', t('toast.loadError'))
      } finally {
        if (!silent && !signal?.aborted) setLoading(false)
      }
    },
    [collectionFilter, showToast, t],
  )

  useEffect(() => {
    const controller = new AbortController()
    void refreshCollections(controller.signal)
    return () => controller.abort()
  }, [refreshCollections])

  useEffect(() => {
    const controller = new AbortController()
    void load(false, controller.signal, collectionFilter)
    return () => controller.abort()
  }, [collectionFilter, load])

  useEffect(() => {
    if (!addCollectionId && collections[0]) {
      setAddCollectionId(String(collections[0].id))
      return
    }
    if (
      addCollectionId &&
      collections.length > 0 &&
      !collections.some((c) => String(c.id) === addCollectionId)
    ) {
      setAddCollectionId(String(collections[0]?.id ?? ''))
    }
  }, [addCollectionId, collections])

  const currentCollection = useMemo(
    () =>
      typeof collectionFilter === 'number'
        ? (collections.find((c) => c.id === collectionFilter) ?? null)
        : null,
    [collectionFilter, collections],
  )

  const handleImageNaturalSize = useCallback((name: string, width: number, height: number) => {
    setImageDimensionsByName((prev) => {
      const existing = prev[name]
      if (existing?.width === width && existing?.height === height) return prev
      return { ...prev, [name]: { width, height } }
    })
  }, [])

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (list.length === 0) {
        showToast('error', t('upload.invalidType'))
        return
      }
      setUploading(true)
      try {
        const results = await Promise.allSettled(
          list.map(async (file) => {
            const fd = new FormData()
            fd.set('file', file)
            const res = await fetch('/api/media/upload', {
              method: 'POST',
              body: fd,
            })
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { message?: string }
              throw new Error(err.message ?? 'upload')
            }
            return res.json() as Promise<MediaCatalogItem>
          }),
        )
        const ok = results.filter((r) => r.status === 'fulfilled').length
        const fail = results.length - ok
        if (ok > 0) {
          await load(true)
          await refreshCollections()
          showToast('success', t('toast.uploaded'))
        }
        if (fail > 0 && ok === 0) {
          showToast('error', t('toast.uploadError'))
        } else if (fail > 0) {
          showToast('error', t('toast.uploadPartial'))
        }
      } finally {
        setUploading(false)
      }
    },
    [load, refreshCollections, showToast, t],
  )

  const onDelete = useCallback(
    async (name: string) => {
      setDeleting(name)
      try {
        const res = await fetch('/api/media/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error('delete')
        showToast('success', t('toast.deleted'))
        setItems((prev) => prev.filter((i) => i.name !== name))
        setPreview((p) => (p?.name === name ? null : p))
        setSelected((s) => (s?.name === name ? null : s))
        await refreshCollections()
      } catch {
        showToast('error', t('toast.deleteError'))
      } finally {
        setDeleting(null)
      }
    },
    [refreshCollections, showToast, t],
  )

  const state = useMemo<MediaState>(
    () => ({
      items,
      collections,
      collectionFilter,
      loading,
      loadError,
      uploading,
      collectionsBusy,
      dragActive,
      deleting,
      pendingDeleteName,
      imageDimensionsByName,
      preview,
      selected,
      addCollectionId,
      organizeBarHeight,
      currentCollection,
    }),
    [
      items,
      collections,
      collectionFilter,
      loading,
      loadError,
      uploading,
      collectionsBusy,
      dragActive,
      deleting,
      pendingDeleteName,
      imageDimensionsByName,
      preview,
      selected,
      addCollectionId,
      organizeBarHeight,
      currentCollection,
    ],
  )

  const actions = useMemo<MediaActions>(
    () => ({
      setDragActive,
      setPreview,
      setPendingDeleteName,
      setAddCollectionId,
      setOrganizeBarHeight,
      handleImageNaturalSize,
      handleSelect: (item) => {
        setSelected((prev) => {
          if (prev?.name === item.name) return null
          const fromList = items.find((i) => i.name === item.name)
          return fromList ?? { ...item, displayName: null }
        })
      },
      handleFilterChange: (key) => {
        setCollectionFilter(key)
        setSelected(null)
      },
      clearSelection: () => setSelected(null),
      onInputChange: (e) => {
        const files = e.target.files
        if (files?.length) void uploadFiles(files)
        e.target.value = ''
      },
      onDrop: (e) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files)
      },
      onBrowse: () => inputRef.current?.click(),
      retryLoad: () => void load(false),
      confirmDelete: (name) => {
        void onDelete(name)
        setPendingDeleteName(null)
      },
      createCollection: async (name) => {
        setCollectionsBusy(true)
        try {
          const created = await createMediaCollection(name)
          await refreshCollections()
          setCollectionFilter(created.id)
          setSelected(null)
          showToast('success', t('toast.collectionCreated'))
          return true
        } catch {
          showToast('error', t('toast.collectionCreateError'))
          return false
        } finally {
          setCollectionsBusy(false)
        }
      },
      renameCollection: async (id, name) => {
        setCollectionsBusy(true)
        try {
          await updateMediaCollection(id, name)
          await refreshCollections()
          showToast('success', t('toast.collectionRenamed'))
          return true
        } catch {
          showToast('error', t('toast.collectionRenameError'))
          return false
        } finally {
          setCollectionsBusy(false)
        }
      },
      deleteCollection: async (id) => {
        setCollectionsBusy(true)
        try {
          await deleteMediaCollection(id)
          if (collectionFilter === id) setCollectionFilter('all')
          setSelected(null)
          await refreshCollections()
          showToast('success', t('toast.collectionDeleted'))
          return true
        } catch {
          showToast('error', t('toast.collectionDeleteError'))
          return false
        } finally {
          setCollectionsBusy(false)
        }
      },
      addSelectedToCollection: () => {
        if (!addCollectionId || !selected) return
        void (async () => {
          setCollectionsBusy(true)
          try {
            await addMediaToCollection(Number.parseInt(addCollectionId, 10), selected.name)
            await refreshCollections()
            await load(true)
            showToast('success', t('toast.addedToCollection'))
          } catch {
            showToast('error', t('toast.addToCollectionError'))
          } finally {
            setCollectionsBusy(false)
          }
        })()
      },
      removeSelectedFromCurrent: () => {
        if (!currentCollection || !selected) return
        void (async () => {
          setCollectionsBusy(true)
          try {
            await removeMediaFromCollection(currentCollection.id, selected.name)
            await refreshCollections()
            await load(true)
            showToast('success', t('toast.removedFromCollection'))
          } catch {
            showToast('error', t('toast.removeFromCollectionError'))
          } finally {
            setCollectionsBusy(false)
          }
        })()
      },
    }),
    [
      addCollectionId,
      collectionFilter,
      currentCollection,
      handleImageNaturalSize,
      items,
      load,
      onDelete,
      refreshCollections,
      selected,
      showToast,
      t,
      uploadFiles,
    ],
  )

  const meta = useMemo(() => ({ inputRef }), [])

  return (
    <MediaContextProvider state={state} actions={actions} meta={meta}>
      {children}
    </MediaContextProvider>
  )
}
