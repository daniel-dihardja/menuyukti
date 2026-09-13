'use client'

import { ImageIcon, LayoutTemplate, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { useCloseLabel } from '@/hooks/use-close-label'
import { loadMedia, type MediaCatalogItem } from '@/lib/media/client-api'

export type MediaCatalogPickerImage = {
  name: string
  url: string
}

export type MediaCatalogPickerProps = {
  selectedImage: MediaCatalogPickerImage | null
  onSelect: (item: MediaCatalogItem) => void
  onClear: () => void
  disabled?: boolean
  pickLabel: string
  pickerAriaLabel: string
  emptyLabel: string
  removeLabel: string
  fromMediaLabel: string
}

export function MediaCatalogPicker({
  selectedImage,
  onSelect,
  onClear,
  disabled = false,
  pickLabel,
  pickerAriaLabel,
  emptyLabel,
  removeLabel,
  fromMediaLabel,
}: MediaCatalogPickerProps) {
  const closeLabel = useCloseLabel()
  const [open, setOpen] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaCatalogItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function fetchMedia() {
      setLoading(true)
      try {
        const list = await loadMedia()
        if (!cancelled) setMediaItems(list)
      } catch {
        if (!cancelled) setMediaItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchMedia()

    return () => {
      cancelled = true
    }
  }, [open])

  const handleSelect = useCallback(
    (item: MediaCatalogItem) => {
      onSelect(item)
      setOpen(false)
    },
    [onSelect],
  )

  return (
    <div className="flex flex-col gap-2">
      {selectedImage ? (
        <div className="flex items-start gap-3 rounded-md border border-border/60 p-3">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted/20 sm:size-28">
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="size-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-sm font-medium">{selectedImage.name}</p>
            <p className="text-muted-foreground text-xs">{fromMediaLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setOpen(true)}
              >
                <LayoutTemplate className="size-4 shrink-0" aria-hidden />
                {pickLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label={removeLabel}
                onClick={onClear}
              >
                <X className="size-4 shrink-0" aria-hidden />
                {removeLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <LayoutTemplate className="size-4 shrink-0" aria-hidden />
          {pickLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[min(90vh,40rem)] flex-col gap-4 overflow-hidden sm:max-w-2xl"
          closeLabel={closeLabel}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>{pickerAriaLabel}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain pr-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-md" />
                ))}
                <div className="col-span-full flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm">
                  <Spinner />
                </div>
              </div>
            ) : mediaItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={pickerAriaLabel}>
                {mediaItems.map((item) => {
                  const label = item.displayName?.trim() || item.name
                  const selected = selectedImage?.name === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-label={label}
                      aria-pressed={selected}
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-md border border-border/80 bg-muted/30 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        selected && 'ring-2 ring-primary',
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                        <img
                          src={item.url}
                          alt=""
                          className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1.5 text-left text-xs text-white">
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
