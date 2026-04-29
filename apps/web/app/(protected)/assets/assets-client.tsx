'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Download, ImageIcon, Loader2, Maximize2, Sparkles, Trash2, Upload } from 'lucide-react'

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
import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Dialog, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

type AssetItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

type ToastState = { kind: 'success' | 'error'; message: string } | null

/** Post-upload processing flow slug; sent with FormData as `flow` (`none` = no AI). */

const SKELETON_COUNT = 8

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDimensions(width?: number, height?: number): string | null {
  if (!width || !height) return null
  return `${width} X ${height}`
}

function assetDownloadHref(name: string): string {
  return `/api/assets/download?name=${encodeURIComponent(name)}`
}

export function AssetsClient() {
  const t = useTranslations('assets')
  const tImageFlows = useTranslations('imageFlows')
  const format = useFormatter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)
  const [selectedFlow, setSelectedFlow] = useState<string>('none')
  const [cardFlows, setCardFlows] = useState<Record<string, string>>({})
  const [cardCustomPrompts, setCardCustomPrompts] = useState<Record<string, string>>({})
  const [generatingByName, setGeneratingByName] = useState<Record<string, boolean>>({})
  const [imageDimensionsByName, setImageDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [aiFlows, setAiFlows] = useState<Array<{ slug: string; displayName: string }>>([])
  const [flowsLoading, setFlowsLoading] = useState(true)
  const [previewItem, setPreviewItem] = useState<AssetItem | null>(null)
  const [previewImgLoaded, setPreviewImgLoaded] = useState(false)

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const load = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch('/api/assets/list', { signal })
        if (!res.ok) throw new Error('list failed')
        const data = (await res.json()) as { items: AssetItem[] }
        setItems(data.items ?? [])
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

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setFlowsLoading(true)
      try {
        const res = await fetch('/api/assets/flows', { signal: controller.signal })
        if (!res.ok) throw new Error('flows')
        const data = (await res.json()) as {
          flows?: Array<{ slug: string; displayName: string }>
        }
        setAiFlows(data.flows ?? [])
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        setAiFlows([])
        showToast('error', t('toast.flowsLoadError'))
      } finally {
        if (!controller.signal.aborted) setFlowsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [showToast, t])

  useEffect(() => {
    if (selectedFlow === 'none') return
    if (!aiFlows.some((f) => f.slug === selectedFlow)) {
      setSelectedFlow('none')
    }
  }, [aiFlows, selectedFlow])

  useEffect(() => {
    setPreviewImgLoaded(false)
  }, [previewItem?.name])

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
          fd.set('flow', selectedFlow)
          const res = await fetch('/api/assets/upload', {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as {
              message?: string
              code?: string
            }
            const e = new Error(err.message ?? 'upload') as Error & { code?: string }
            if (err.code === 'leonardo' || err.code === 'leonardo_tokens') e.code = err.code
            throw e
          }
          return res.json() as Promise<AssetItem>
        }),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      const leonardoOnly =
        fail > 0 &&
        ok === 0 &&
        results.every((r) => {
          if (r.status !== 'rejected') return false
          const reason = r.reason as Error & { code?: string }
          return reason?.code === 'leonardo' || reason?.code === 'leonardo_tokens'
        })
      const leonardoTokensOnly =
        leonardoOnly &&
        results.every((r) => {
          if (r.status !== 'rejected') return false
          const reason = r.reason as Error & { code?: string }
          return reason?.code === 'leonardo_tokens'
        })
      if (ok > 0) {
        await load(true)
      }
      if (fail === 0) {
        showToast('success', t('toast.uploaded'))
      } else if (ok > 0) {
        showToast('error', t('toast.uploadPartial'))
      } else if (leonardoTokensOnly) {
        showToast('error', t('toast.leonardoInsufficientTokens'))
      } else if (leonardoOnly) {
        showToast('error', t('toast.leonardoError'))
      } else {
        showToast('error', t('toast.uploadError'))
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
      const res = await fetch('/api/assets/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('delete')
      showToast('success', t('toast.deleted'))
      setItems((prev) => prev.filter((i) => i.name !== name))
      setPreviewItem((p) => (p?.name === name ? null : p))
    } catch {
      showToast('error', t('toast.deleteError'))
    } finally {
      setDeleting(null)
    }
  }

  const onGenerate = async (item: AssetItem) => {
    const flow = cardFlows[item.name] ?? 'none'
    const customPrompt = cardCustomPrompts[item.name]?.trim() ?? ''
    if (flow === 'none') return
    if (flow === 'custom' && customPrompt.length === 0) {
      showToast('error', t('toast.customPromptRequired'))
      return
    }

    setGeneratingByName((prev) => ({ ...prev, [item.name]: true }))
    try {
      const res = await fetch('/api/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          flow,
          prompt: flow === 'custom' ? customPrompt : undefined,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string; code?: string }
        const e = new Error(err.message ?? 'generate') as Error & { code?: string }
        if (err.code === 'leonardo' || err.code === 'leonardo_tokens') e.code = err.code
        throw e
      }
      const created = (await res.json()) as AssetItem
      setItems((prev) => [created, ...prev])
      showToast('success', t('toast.generated'))
    } catch (err) {
      const reason = err as Error & { code?: string }
      if (reason.code === 'leonardo_tokens') {
        showToast('error', t('toast.leonardoInsufficientTokens'))
      } else if (reason.code === 'leonardo') {
        showToast('error', t('toast.leonardoError'))
      } else {
        showToast('error', t('toast.generateError'))
      }
    } finally {
      setGeneratingByName((prev) => ({ ...prev, [item.name]: false }))
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300',
            toast.kind === 'success'
              ? 'border-border bg-card text-foreground'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <AlertDialog
        open={pendingDeleteName !== null}
        onOpenChange={(open) => !open && setPendingDeleteName(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('grid.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('grid.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tImageFlows('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDeleteName) return
                void onDelete(pendingDeleteName)
                setPendingDeleteName(null)
              }}
            >
              {t('grid.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewItem(null)}>
        {previewItem ? (
          <DialogContent
            key={previewItem.name}
            overlayClassName="bg-black/80 backdrop-blur-sm"
            showCloseButton
            className={cn(
              'flex max-h-[90vh] w-full max-w-[min(96vw,1400px)] flex-col gap-0 overflow-hidden border border-border/50 bg-background p-0 shadow-2xl',
              'sm:max-w-[min(96vw,1400px)]',
            )}
          >
            <DialogTitle className="sr-only">{previewItem.name}</DialogTitle>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 pr-14 backdrop-blur-md">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium tracking-tight">{previewItem.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(previewItem.size)}
                  <span className="mx-1.5 text-border">·</span>
                  <time dateTime={previewItem.createdAt}>
                    {format.dateTime(new Date(previewItem.createdAt), {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full shadow-sm"
                  asChild
                >
                  <a href={assetDownloadHref(previewItem.name)} download={previewItem.name}>
                    <Download className="mr-1.5 h-4 w-4" aria-hidden />
                    {t('grid.download')}
                  </a>
                </Button>
              </div>
            </div>
            <div className="relative flex min-h-[min(60vh,720px)] max-h-[calc(90vh-5rem)] items-center justify-center bg-gradient-to-b from-muted/25 via-muted/10 to-black/[0.06] px-4 py-8 dark:to-black/30">
              {!previewImgLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */}
              <img
                src={previewItem.url}
                alt=""
                width={1200}
                height={900}
                className={cn(
                  'max-h-[calc(90vh-5.5rem)] w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300',
                  previewImgLoaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setPreviewImgLoaded(true)}
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <section>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label={t('upload.browse')}
          className="sr-only"
          onChange={onInputChange}
        />
        <Card
          className={cn(
            'group relative overflow-hidden border-2 border-dashed transition-[border-color,background-color,box-shadow,opacity] duration-300',
            dragActive
              ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
              : 'border-muted-foreground/25 bg-gradient-to-br from-muted/40 via-background to-muted/20 hover:border-primary/40 hover:shadow-md',
            uploading && 'pointer-events-none opacity-80',
          )}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            if (e.currentTarget === e.target) setDragActive(false)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDrop={onDrop}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),_transparent_55%)] pointer-events-none" />
          <div className="relative flex flex-col gap-3 px-4 py-7 sm:gap-3 sm:px-5 sm:py-8">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background/80 shadow-sm transition-transform duration-300',
                  dragActive ? 'scale-105 border-primary/50 text-primary' : 'text-muted-foreground',
                )}
              >
                {uploading ? (
                  <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
                ) : (
                  <Upload className="size-5" aria-hidden />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <h2 className="text-base font-semibold tracking-tight">{t('upload.title')}</h2>
                <p className="text-pretty text-xs text-muted-foreground sm:text-sm">
                  {t('upload.hint')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
              <Field className="min-w-0 flex-1 gap-1.5">
                <FieldLabel
                  htmlFor="asset-upload-flow"
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
                >
                  {t('upload.flow.label')}
                </FieldLabel>
                <Select
                  value={selectedFlow}
                  onValueChange={setSelectedFlow}
                  disabled={uploading || flowsLoading}
                >
                  <SelectTrigger
                    id="asset-upload-flow"
                    size="default"
                    className={cn(
                      'h-10 w-full justify-between rounded-lg border-border/80 bg-background/90 px-3 shadow-sm transition-[box-shadow,border-color] duration-200',
                      'hover:border-primary/30 hover:bg-background',
                      'data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]',
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    position="popper"
                    className="min-w-[var(--radix-select-trigger-width)]"
                  >
                    <SelectItem value="none">{t('upload.flow.none')}</SelectItem>
                    {aiFlows.map((flow) => (
                      <SelectItem key={flow.slug} value={flow.slug} className="cursor-pointer">
                        <span className="flex w-full items-center gap-2">
                          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                          <span className="flex-1">{flow.displayName}</span>
                          <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                            AI
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="button"
                className="h-10 shrink-0 rounded-full px-6 shadow-sm sm:min-w-[9rem]"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('upload.uploading')}
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {t('upload.browse')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="w-full">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
              >
                <Skeleton className="aspect-[4/3]" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed bg-muted/20 py-16 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t('grid.empty.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('grid.empty.description')}</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {items.map((item) => {
              const dimensions = formatDimensions(
                imageDimensionsByName[item.name]?.width,
                imageDimensionsByName[item.name]?.height,
              )
              const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`
              return (
                <figure
                  key={item.name}
                  className="group/tile min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <button
                    className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-muted/30 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    type="button"
                    aria-label={t('grid.viewLarge')}
                    onClick={() => setPreviewItem(item)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */}
                    <img
                      src={item.url}
                      alt=""
                      width={400}
                      height={300}
                      loading="lazy"
                      className="size-full object-cover transition duration-300 group-hover/tile:scale-[1.02]"
                      onLoad={(e) => {
                        const width = e.currentTarget.naturalWidth
                        const height = e.currentTarget.naturalHeight
                        setImageDimensionsByName((prev) => {
                          const current = prev[item.name]
                          if (current?.width === width && current?.height === height) return prev
                          return { ...prev, [item.name]: { width, height } }
                        })
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3 opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100">
                      <figcaption className="min-w-0 flex-1 truncate text-left text-xs font-medium text-white drop-shadow">
                        {item.name}
                      </figcaption>
                      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-9 w-9 rounded-full bg-white/95 text-foreground shadow-md hover:bg-white"
                          aria-label={t('grid.viewLarge')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewItem(item)
                          }}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-9 w-9 rounded-full bg-white/95 text-foreground shadow-md hover:bg-white"
                          aria-label={t('grid.download')}
                          asChild
                        >
                          <a
                            href={assetDownloadHref(item.name)}
                            download={item.name}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-9 w-9 shrink-0 rounded-full bg-white/95 text-destructive shadow-md hover:bg-white"
                          disabled={deleting === item.name}
                          aria-label={t('grid.delete')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPendingDeleteName(item.name)
                          }}
                        >
                          {deleting === item.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="truncate">{sizeWithDimensions}</span>
                    <time dateTime={item.createdAt}>
                      {format.dateTime(new Date(item.createdAt), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-border/50 px-3 py-3">
                    <Field className="gap-1.5">
                      <FieldLabel
                        htmlFor={`asset-flow-${item.name}`}
                        className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
                      >
                        {t('grid.generate.flowLabel')}
                      </FieldLabel>
                      <Select
                        value={cardFlows[item.name] ?? 'none'}
                        onValueChange={(value) => {
                          setCardFlows((prev) => ({ ...prev, [item.name]: value }))
                        }}
                        disabled={flowsLoading || generatingByName[item.name]}
                      >
                        <SelectTrigger id={`asset-flow-${item.name}`} size="sm" className="w-full">
                          <SelectValue placeholder={t('grid.generate.flowPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent
                          align="start"
                          position="popper"
                          className="min-w-[var(--radix-select-trigger-width)]"
                        >
                          <SelectItem value="none">{t('upload.flow.none')}</SelectItem>
                          <SelectItem value="custom">{t('grid.generate.customOption')}</SelectItem>
                          {aiFlows.map((flow) => (
                            <SelectItem key={`${item.name}-${flow.slug}`} value={flow.slug}>
                              {flow.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {(cardFlows[item.name] ?? 'none') === 'custom' ? (
                      <Field className="gap-1.5">
                        <FieldLabel
                          htmlFor={`asset-custom-prompt-${item.name}`}
                          className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
                        >
                          {t('grid.generate.customPromptLabel')}
                        </FieldLabel>
                        <Textarea
                          id={`asset-custom-prompt-${item.name}`}
                          value={cardCustomPrompts[item.name] ?? ''}
                          onChange={(e) => {
                            setCardCustomPrompts((prev) => ({
                              ...prev,
                              [item.name]: e.target.value,
                            }))
                          }}
                          placeholder={t('grid.generate.customPromptPlaceholder')}
                          rows={3}
                          disabled={generatingByName[item.name]}
                        />
                      </Field>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={
                        flowsLoading ||
                        generatingByName[item.name] ||
                        (cardFlows[item.name] ?? 'none') === 'none' ||
                        ((cardFlows[item.name] ?? 'none') === 'custom' &&
                          (cardCustomPrompts[item.name]?.trim() ?? '').length === 0)
                      }
                      onClick={() => void onGenerate(item)}
                    >
                      {generatingByName[item.name] ? (
                        <>
                          <Loader2 className="animate-spin" data-icon="inline-start" />
                          {t('grid.generate.generating')}
                        </>
                      ) : (
                        <>
                          <Sparkles data-icon="inline-start" />
                          {t('grid.generate.button')}
                        </>
                      )}
                    </Button>
                  </div>
                </figure>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
