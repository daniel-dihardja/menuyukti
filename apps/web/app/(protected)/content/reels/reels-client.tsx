'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, X } from 'lucide-react'

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
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { cn } from '@workspace/ui/lib/utils'

import { loadReels, MAX_REEL_VIDEO_BYTES, type ReelCatalogItem } from '@/lib/reels/client-api'

import { ReelsMediaGrid } from './_components/reels-media-grid'
import { ReelsUploadZone } from './_components/reels-upload-zone'

type ToastState = { kind: 'success' | 'error'; message: string } | null

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

function isAllowedReelFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return ALLOWED_VIDEO_TYPES.has(file.type.toLowerCase())
}

export function ReelsClient() {
  const t = useTranslations('reels')
  const inputRef = useRef<HTMLInputElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [items, setItems] = useState<ReelCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)
  const [mediaDimensionsByName, setMediaDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [preview, setPreview] = useState<ReelCatalogItem | null>(null)
  const [previewMediaLoaded, setPreviewMediaLoaded] = useState(false)

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const closePreview = useCallback(() => {
    previewVideoRef.current?.pause()
    setPreview(null)
    setPreviewMediaLoaded(false)
  }, [])

  const load = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (!silent) setLoading(true)
      try {
        const list = await loadReels({ signal })
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

  const setMediaDimensions = useCallback((name: string, width: number, height: number) => {
    setMediaDimensionsByName((prev) => {
      const existing = prev[name]
      if (existing?.width === width && existing?.height === height) return prev
      return { ...prev, [name]: { width, height } }
    })
  }, [])

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(isAllowedReelFile)
    if (list.length === 0) {
      showToast('error', t('upload.invalidType'))
      return
    }

    const oversized = list.filter(
      (f) => ALLOWED_VIDEO_TYPES.has(f.type.toLowerCase()) && f.size > MAX_REEL_VIDEO_BYTES,
    )
    if (oversized.length > 0) {
      showToast('error', t('upload.tooLarge'))
      return
    }

    setUploading(true)
    try {
      const results = await Promise.allSettled(
        list.map(async (file) => {
          const fd = new FormData()
          fd.set('file', file)
          const res = await fetch('/api/reels/upload', {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { message?: string }
            throw new Error(err.message ?? 'upload')
          }
          return res.json() as Promise<ReelCatalogItem>
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
      const res = await fetch('/api/reels/delete', {
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

      <ReelsUploadZone
        inputRef={inputRef}
        uploading={uploading}
        dragActive={dragActive}
        onSetDragActive={setDragActive}
        onInputChange={onInputChange}
        onDrop={onDrop}
        onBrowse={() => inputRef.current?.click()}
      />

      <ReelsMediaGrid
        loading={loading}
        items={items}
        imageDimensionsByName={mediaDimensionsByName}
        onImageNaturalSize={setMediaDimensions}
        onVideoMetadata={setMediaDimensions}
        deleting={deleting}
        onPreview={(item) => {
          setPreviewMediaLoaded(false)
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
          if (!open) closePreview()
        }}
      >
        {preview ? (
          <DialogContent
            showCloseButton={false}
            className="max-w-[min(96vw,72rem)] border-none bg-transparent p-0 shadow-none sm:max-w-[min(96vw,72rem)]"
          >
            <DialogTitle className="sr-only">{preview.name}</DialogTitle>
            <div className="relative flex min-h-[12rem] items-center justify-center">
              <DialogClose
                type="button"
                aria-label={t('preview.close')}
                className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-offset-background transition-opacity hover:bg-black/85 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
                onClick={() => closePreview()}
              >
                <X className="h-5 w-5" aria-hidden />
              </DialogClose>
              {!previewMediaLoaded ? (
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : null}
              {preview.mediaType === 'video' ? (
                <video
                  ref={previewVideoRef}
                  src={preview.url}
                  controls
                  autoPlay
                  playsInline
                  className={cn(
                    'relative z-10 w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300',
                    'max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(90vh-5.5rem)]',
                    previewMediaLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoadedData={() => setPreviewMediaLoaded(true)}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */
                <img
                  src={preview.url}
                  alt=""
                  width={1200}
                  height={900}
                  className={cn(
                    'relative z-10 w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300',
                    'max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(90vh-5.5rem)]',
                    previewMediaLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setPreviewMediaLoaded(true)}
                />
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
