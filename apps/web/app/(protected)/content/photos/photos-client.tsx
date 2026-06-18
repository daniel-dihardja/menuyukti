'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

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
import { Dialog, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { cn } from '@workspace/ui/lib/utils'

import type { AssetItem } from '@/app/(protected)/canvas/_components/asset-item-types'
import { loadPhotos } from '@/lib/photos/client-api'

import { PhotosImageGrid } from './_components/photos-image-grid'
import { PhotosUploadZone } from './_components/photos-upload-zone'

type ToastState = { kind: 'success' | 'error'; message: string } | null

export function PhotosClient() {
  const t = useTranslations('photos')
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)
  const [imageDimensionsByName, setImageDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [preview, setPreview] = useState<AssetItem | null>(null)
  const [previewImgLoaded, setPreviewImgLoaded] = useState(false)

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
          return res.json() as Promise<AssetItem>
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

      <PhotosImageGrid
        loading={loading}
        items={items}
        imageDimensionsByName={imageDimensionsByName}
        onImageNaturalSize={handleImageNaturalSize}
        deleting={deleting}
        onPreview={(item) => {
          setPreviewImgLoaded(false)
          setPreview(item)
        }}
        onDeleteRequest={setPendingDeleteName}
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

      <Dialog
        open={preview != null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        {preview ? (
          <DialogContent className="max-w-[min(96vw,72rem)] border-none bg-transparent p-0 shadow-none sm:max-w-[min(96vw,72rem)]">
            <DialogTitle className="sr-only">{preview.name}</DialogTitle>
            <div className="relative flex min-h-[12rem] items-center justify-center">
              {!previewImgLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */}
              <img
                src={preview.url}
                alt=""
                width={1200}
                height={900}
                className={cn(
                  'w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300',
                  'max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(90vh-5.5rem)]',
                  previewImgLoaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setPreviewImgLoaded(true)}
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
