'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Download, Loader2 } from 'lucide-react'
import { parseAsStringLiteral, useQueryState } from 'nuqs'

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
import { Dialog, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { cn } from '@workspace/ui/lib/utils'

import type { BackgroundItem } from '@/lib/assets/backgrounds'

import {
  assetBackgroundDownloadHref,
  assetDownloadHref,
  formatBytes,
  type AssetItem,
  type AssetPreviewItem,
} from './_components/asset-item-types'
import { AssetsImageGrid } from './_components/assets-image-grid'
import { AssetsUploadZone } from './_components/assets-upload-zone'
import { BackgroundsImageGrid } from './_components/backgrounds-image-grid'
import { ContentImageCreateDialog } from '../workflows/_components/milestone-preview/content-image-create-dialog'

type ToastState = { kind: 'success' | 'error'; message: string } | null

type PreviewState = { item: AssetPreviewItem; kind: 'product' | 'background' } | null

const canvasTabParser = parseAsStringLiteral(['products', 'backgrounds'] as const).withDefault(
  'products',
)

export function AssetsClient() {
  const t = useTranslations('assets')
  const tImageFlows = useTranslations('imageFlows')
  const format = useFormatter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [canvasTab, setCanvasTab] = useQueryState('tab', canvasTabParser)
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
  const [bgCardFlows, setBgCardFlows] = useState<Record<string, string>>({})
  const [bgCardCustomPrompts, setBgCardCustomPrompts] = useState<Record<string, string>>({})
  const [generatingByName, setGeneratingByName] = useState<Record<string, boolean>>({})
  const [imageDimensionsByName, setImageDimensionsByName] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [aiFlows, setAiFlows] = useState<Array<{ slug: string; displayName: string }>>([])
  const [flowsLoading, setFlowsLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewState>(null)
  const [previewImgLoaded, setPreviewImgLoaded] = useState(false)
  const [backgroundItems, setBackgroundItems] = useState<BackgroundItem[]>([])
  const [backgroundsLoading, setBackgroundsLoading] = useState(false)
  const [contentImageDialogOpen, setContentImageDialogOpen] = useState(false)
  const backgroundsLoadedRef = useRef(false)

  const activeTab = canvasTab ?? 'products'

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const load = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch('/api/assets/list', {
          signal,
          // List GET is Cache-Control max-age=30; without this, post-upload refetches
          // can return a stale list (especially on mobile) while generate uses POST JSON.
          cache: 'no-store',
        })
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
    if (activeTab !== 'backgrounds') return
    if (backgroundsLoadedRef.current) return

    let cancelled = false
    void (async () => {
      setBackgroundsLoading(true)
      try {
        const res = await fetch('/api/assets/backgrounds/list', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('list failed')
        const data = (await res.json()) as { items: BackgroundItem[] }
        if (!cancelled) {
          setBackgroundItems(data.items ?? [])
          backgroundsLoadedRef.current = true
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        if (!cancelled) {
          setBackgroundItems([])
          showToast('error', t('backgrounds.loadError'))
        }
      } finally {
        setBackgroundsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeTab, showToast, t])

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
  }, [preview?.item.name])

  const handleImageNaturalSize = useCallback((name: string, width: number, height: number) => {
    setImageDimensionsByName((prev) => {
      const current = prev[name]
      if (current?.width === width && current?.height === height) return prev
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
      setPreview((p) => (p?.item.name === name ? null : p))
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

  const previewDownloadHref =
    preview?.kind === 'background'
      ? assetBackgroundDownloadHref(preview.item.name)
      : preview
        ? assetDownloadHref(preview.item.name)
        : '#'

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

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        {preview ? (
          <DialogContent
            key={preview.item.name}
            overlayClassName="bg-black/80 backdrop-blur-sm"
            showCloseButton
            className={cn(
              'flex max-h-[90vh] w-full max-w-[min(96vw,1400px)] flex-col gap-0 overflow-hidden border border-border/50 bg-background p-0 shadow-2xl',
              'sm:max-w-[min(96vw,1400px)]',
            )}
          >
            <DialogTitle className="sr-only">{preview.item.name}</DialogTitle>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 pr-14 backdrop-blur-md">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium tracking-tight">{preview.item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(preview.item.size)}
                  <span className="mx-1.5 text-border">·</span>
                  <time dateTime={preview.item.createdAt}>
                    {format.dateTime(new Date(preview.item.createdAt), {
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
                  <a href={previewDownloadHref} download={preview.item.name}>
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
                src={preview.item.url}
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

      <ContentImageCreateDialog
        open={contentImageDialogOpen}
        onOpenChange={setContentImageDialogOpen}
      />

      <div className="flex items-center justify-end">
        <Button type="button" onClick={() => setContentImageDialogOpen(true)}>
          {t('contentImage.newButton')}
        </Button>
      </div>

      <Tabs
        className="flex w-full flex-col gap-6"
        value={activeTab}
        onValueChange={(v) => {
          void setCanvasTab(v as 'products' | 'backgrounds')
        }}
      >
        <TabsList
          className="w-full min-w-0 max-w-full justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          variant="line"
        >
          <TabsTrigger className="shrink-0" value="products">
            {t('tabs.products')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="backgrounds">
            {t('tabs.backgrounds')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-0 flex flex-col gap-6 outline-none">
          <AssetsUploadZone
            inputRef={inputRef}
            selectedFlow={selectedFlow}
            onSelectedFlowChange={setSelectedFlow}
            aiFlows={aiFlows}
            uploading={uploading}
            flowsLoading={flowsLoading}
            dragActive={dragActive}
            onSetDragActive={setDragActive}
            onInputChange={onInputChange}
            onDrop={onDrop}
            onBrowse={() => inputRef.current?.click()}
          />

          <AssetsImageGrid
            loading={loading}
            items={items}
            imageDimensionsByName={imageDimensionsByName}
            onImageNaturalSize={handleImageNaturalSize}
            cardFlows={cardFlows}
            onCardFlowChange={(name, value) => {
              setCardFlows((prev) => ({ ...prev, [name]: value }))
            }}
            cardCustomPrompts={cardCustomPrompts}
            onCardCustomPromptChange={(name, value) => {
              setCardCustomPrompts((prev) => ({ ...prev, [name]: value }))
            }}
            aiFlows={aiFlows}
            flowsLoading={flowsLoading}
            generatingByName={generatingByName}
            deleting={deleting}
            onPreview={(item) => setPreview({ item, kind: 'product' })}
            onDeleteRequest={setPendingDeleteName}
            onGenerate={onGenerate}
          />
        </TabsContent>

        <TabsContent value="backgrounds" className="mt-0 outline-none">
          <BackgroundsImageGrid
            loading={backgroundsLoading}
            items={backgroundItems}
            imageDimensionsByName={imageDimensionsByName}
            onImageNaturalSize={handleImageNaturalSize}
            bgCardFlows={bgCardFlows}
            onBgCardFlowChange={(name, value) => {
              setBgCardFlows((prev) => ({ ...prev, [name]: value }))
            }}
            bgCardCustomPrompts={bgCardCustomPrompts}
            onBgCardCustomPromptChange={(name, value) => {
              setBgCardCustomPrompts((prev) => ({ ...prev, [name]: value }))
            }}
            onGenerate={() => undefined}
            onPreview={(item) =>
              setPreview({
                item: {
                  name: item.name,
                  url: item.url,
                  size: item.size,
                  createdAt: item.createdAt,
                },
                kind: 'background',
              })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
