'use client'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/command'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { ImageIcon, LayoutTemplate, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { loadMedia, type MediaCatalogItem } from '@/lib/media/client-api'

import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'

export type PostCreatorTemplatePickerProps = {
  templateImage: PostCreatorReferenceImage | null
  onSelectTemplate: (item: MediaCatalogItem) => void
  onClearTemplate: () => void
  disabled?: boolean
  pickLabel: string
  pickerAriaLabel: string
  emptyLabel: string
  removeLabel: string
  fromMediaLabel: string
}

export function PostCreatorTemplatePicker({
  templateImage,
  onSelectTemplate,
  onClearTemplate,
  disabled = false,
  pickLabel,
  pickerAriaLabel,
  emptyLabel,
  removeLabel,
  fromMediaLabel,
}: PostCreatorTemplatePickerProps) {
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
      onSelectTemplate(item)
      setOpen(false)
    },
    [onSelectTemplate],
  )

  if (templateImage) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border/60 p-2">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
          <img src={templateImage.url} alt="" className="size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{templateImage.name}</p>
          <p className="text-muted-foreground text-xs">{fromMediaLabel}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled}
          aria-label={removeLabel}
          onClick={onClearTemplate}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={disabled}
        >
          <LayoutTemplate className="size-4 shrink-0" aria-hidden />
          {pickLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <PopoverHeader className="sr-only">
          <PopoverTitle>{pickerAriaLabel}</PopoverTitle>
        </PopoverHeader>
        <Command shouldFilter={false}>
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
              </div>
            ) : mediaItems.length === 0 ? (
              <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                {emptyLabel}
              </CommandEmpty>
            ) : (
              <CommandGroup aria-label={pickerAriaLabel}>
                {mediaItems.map((item) => (
                  <CommandItem
                    key={item.name}
                    className={cn('flex w-full items-center gap-2')}
                    onSelect={() => handleSelect(item)}
                    value={item.name}
                  >
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                      <img src={item.url} alt="" className="size-8 shrink-0 rounded object-cover" />
                    ) : (
                      <ImageIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="truncate text-sm">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
