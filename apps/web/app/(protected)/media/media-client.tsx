'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ImageIcon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { cn } from '@workspace/ui/lib/utils'

import { ContentMediaGrid } from '@/app/(protected)/content/_components/content-media-grid'
import { ContentMediaPreviewDialog } from '@/app/(protected)/content/_components/content-media-preview-dialog'
import type { ContentCatalogItem } from '@/app/(protected)/content/_components/content-catalog-types'
import {
  addMediaToCollection,
  createMediaCollection,
  deleteMediaCollection,
  listMediaCollections,
  loadMedia,
  mediaDownloadHref,
  removeMediaFromCollection,
  updateMediaCollection,
  type MediaCatalogItem,
  type MediaCollection,
} from '@/lib/media/client-api'

import { MediaCollectionsBar } from './_components/media-collections-bar'
import { MediaOrganizeBar } from './_components/media-organize-bar'
import { MediaUploadZone } from './_components/media-upload-zone'

type ToastState = { kind: 'success' | 'error'; message: string } | null
type CollectionFilter = 'all' | number

export function MediaClient() {
  const t = useTranslations('media')
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaCatalogItem[]>([])
  const [collections, setCollections] = useState<MediaCollection[]>([])
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [collectionsBusy, setCollectionsBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)
  const [imageDimensionsByName, setImageDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [preview, setPreview] = useState<ContentCatalogItem | null>(null)
  const [selected, setSelected] = useState<MediaCatalogItem | null>(null)
  const [addCollectionId, setAddCollectionId] = useState('')

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 4200)
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
        setSelected((prev) => {
          if (!prev) return null
          return list.find((item) => item.name === prev.name) ?? null
        })
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
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

  const uploadFiles = async (files: FileList | File[]) => {
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
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) void uploadFiles(files)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files)
  }

  const onDelete = async (name: string) => {
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
  }

  const handleSelect = (item: ContentCatalogItem) => {
    setSelected((prev) => {
      if (prev?.name === item.name) return null
      const fromList = items.find((i) => i.name === item.name)
      return fromList ?? { ...item, displayName: null }
    })
  }

  const handleFilterChange = (key: CollectionFilter) => {
    setCollectionFilter(key)
    setSelected(null)
  }

  const emptyLabels =
    collectionFilter === 'all'
      ? {
          emptyTitle: t('grid.empty.title'),
          emptyDescription: t('grid.empty.description'),
        }
      : {
          emptyTitle: t('collections.emptyCollectionTitle'),
          emptyDescription: t('collections.emptyCollectionDescription'),
        }

  return (
    <div className={cn('flex w-full flex-col gap-6', selected ? 'pb-28' : undefined)}>
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg',
            selected ? 'bottom-28' : 'bottom-4',
            toast.kind === 'success'
              ? 'border-border bg-background text-foreground'
              : 'border-destructive/50 bg-destructive/10 text-destructive',
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <p className="text-sm text-muted-foreground">{t('collections.help')}</p>
      </div>

      <MediaCollectionsBar
        collections={collections}
        selectedKey={collectionFilter}
        busy={collectionsBusy}
        onSelect={handleFilterChange}
        onCreate={async (name) => {
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
        }}
        onRename={async (id, name) => {
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
        }}
        onDelete={async (id) => {
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
        }}
      />

      {!selected && items.length > 0 ? (
        <p className="text-sm text-muted-foreground">{t('collections.selectHint')}</p>
      ) : null}

      <MediaUploadZone
        inputRef={inputRef}
        uploading={uploading}
        dragActive={dragActive}
        onSetDragActive={setDragActive}
        onInputChange={onInputChange}
        onDrop={onDrop}
        onBrowse={() => inputRef.current?.click()}
      />

      <ContentMediaGrid
        loading={loading}
        items={items}
        imageDimensionsByName={imageDimensionsByName}
        onImageNaturalSize={handleImageNaturalSize}
        onVideoMetadata={handleImageNaturalSize}
        deleting={deleting}
        selectedName={selected?.name ?? null}
        onSelect={handleSelect}
        onPreview={setPreview}
        onDeleteRequest={setPendingDeleteName}
        getDownloadHref={mediaDownloadHref}
        emptyIcon={ImageIcon}
        labels={{
          previewImage: t('grid.viewLarge'),
          previewVideo: t('grid.viewLarge'),
          delete: t('grid.delete'),
          download: t('grid.download'),
          select: t('grid.select'),
          emptyTitle: emptyLabels.emptyTitle,
          emptyDescription: emptyLabels.emptyDescription,
        }}
      />

      {selected ? (
        <MediaOrganizeBar
          selected={selected}
          collections={collections}
          currentCollectionId={currentCollection?.id ?? null}
          currentCollectionName={currentCollection?.name ?? null}
          addCollectionId={addCollectionId}
          onAddCollectionIdChange={setAddCollectionId}
          busy={collectionsBusy}
          onClear={() => setSelected(null)}
          onAdd={() => {
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
          }}
          onRemoveFromCurrent={() => {
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
          }}
        />
      ) : null}

      <AlertDialog
        open={pendingDeleteName != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteName(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('grid.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('grid.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('grid.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteName) void onDelete(pendingDeleteName)
                setPendingDeleteName(null)
              }}
            >
              {t('grid.deleteAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContentMediaPreviewDialog
        item={preview}
        onClose={() => setPreview(null)}
        closeLabel={t('preview.close')}
      />
    </div>
  )
}
