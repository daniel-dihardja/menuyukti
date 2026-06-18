'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { loadPhotos, photoDownloadHref, type PhotoCatalogItem } from '@/lib/photos/client-api'

import { PhotosUploadZone } from './_components/photos-upload-zone'

type ToastState = { kind: 'success' | 'error'; message: string } | null

export function PhotosClient() {
  const t = useTranslations('photos')
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PhotoCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)
  const [imageDimensionsByName, setImageDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [preview, setPreview] = useState<ContentCatalogItem | null>(null)

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const load = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (!silent) setLoading(true)
      try {
        const list = await loadPhotos({ signal })
        setItems(list)
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
    [showToast, t],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(false, controller.signal)
    return () => controller.abort()
  }, [load])

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
          const res = await fetch('/api/photos/upload', {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { message?: string }
            throw new Error(err.message ?? 'upload')
          }
          return res.json() as Promise<PhotoCatalogItem>
        }),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (ok > 0) {
        await load(true)
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
      const res = await fetch('/api/photos/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('delete')
      showToast('success', t('toast.deleted'))
      setItems((prev) => prev.filter((i) => i.name !== name))
      setPreview((p) => (p?.name === name ? null : p))
    } catch {
      showToast('error', t('toast.deleteError'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg',
            toast.kind === 'success'
              ? 'border-border bg-background text-foreground'
              : 'border-destructive/50 bg-destructive/10 text-destructive',
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <PhotosUploadZone
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
        onPreview={setPreview}
        onDeleteRequest={setPendingDeleteName}
        getDownloadHref={photoDownloadHref}
        emptyIcon={ImageIcon}
        labels={{
          previewImage: t('grid.viewLarge'),
          previewVideo: t('grid.viewLarge'),
          delete: t('grid.delete'),
          download: t('grid.download'),
          emptyTitle: t('grid.empty.title'),
          emptyDescription: t('grid.empty.description'),
        }}
      />

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
