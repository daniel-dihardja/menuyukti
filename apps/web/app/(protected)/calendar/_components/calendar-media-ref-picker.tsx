'use client'

import { useEffect, useState } from 'react'
import { Check, ImageIcon, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import type { CalendarMediaRef } from '@/lib/calendar/client-api'
import { loadMedia, mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import { useCloseLabel } from '@/hooks/use-close-label'

function MediaThumbGrid({
  items,
  selectedNames,
  onToggle,
  emptyLabel,
  toggleAriaLabel,
}: {
  items: MediaCatalogItem[]
  selectedNames: Set<string>
  onToggle: (name: string) => void
  emptyLabel: string
  toggleAriaLabel: (name: string) => string
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item) => {
        const selected = selectedNames.has(item.name)
        const href = mediaDownloadHref(item.name)
        const label = item.displayName?.trim() || item.name
        return (
          <button
            key={item.name}
            type="button"
            aria-label={toggleAriaLabel(label)}
            aria-pressed={selected}
            className={cn(
              'relative aspect-square overflow-hidden rounded-md border border-border/80 bg-muted/30 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'ring-2 ring-primary',
            )}
            onClick={() => {
              onToggle(item.name)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={href} alt="" className="size-full object-cover" />
            {selected ? (
              <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check aria-hidden />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

type CalendarMediaRefPickerProps = {
  value: CalendarMediaRef[]
  onChange: (next: CalendarMediaRef[]) => void
  disabled?: boolean
}

export function CalendarMediaRefPicker({ value, onChange, disabled }: CalendarMediaRefPickerProps) {
  const t = useTranslations('platform.calendar.createEntry')
  const closeLabel = useCloseLabel()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [photos, setPhotos] = useState<MediaCatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<CalendarMediaRef[]>([])

  useEffect(() => {
    if (!pickerOpen) return
    setDraft(value)
    let cancelled = false
    setLoading(true)
    void loadMedia()
      .then((photoItems) => {
        if (cancelled) return
        setPhotos(photoItems)
      })
      .catch(() => {
        if (cancelled) return
        setPhotos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pickerOpen, value])

  const selectedNames = new Set(draft.map((ref) => ref.name))

  const toggleRef = (name: string) => {
    if (selectedNames.has(name)) {
      setDraft((prev) => prev.filter((ref) => ref.name !== name))
      return
    }
    setDraft((prev) => [...prev, { kind: 'photo', name }])
  }

  return (
    <Field>
      <FieldLabel>{t('mediaLabel')}</FieldLabel>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((ref) => (
            <div
              key={ref.name}
              className="relative size-14 overflow-hidden rounded-md border border-border/80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaDownloadHref(ref.name)} alt="" className="size-full object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-0.5 right-0.5 size-5 rounded-full"
                disabled={disabled}
                aria-label={t('mediaRemove')}
                onClick={() => {
                  onChange(value.filter((item) => item.name !== ref.name))
                }}
              >
                <X aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('mediaEmpty')}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled}
        onClick={() => {
          setPickerOpen(true)
        }}
      >
        <ImageIcon data-icon="inline-start" />
        {t('mediaAttach')}
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent
          className="flex max-h-[min(90vh,36rem)] flex-col gap-4 sm:max-w-lg"
          closeLabel={closeLabel}
        >
          <DialogHeader>
            <DialogTitle>{t('mediaPickerTitle')}</DialogTitle>
            <DialogDescription>{t('mediaPickerDescription')}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 pr-3">
            {loading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-md" />
                ))}
              </div>
            ) : (
              <MediaThumbGrid
                items={photos}
                selectedNames={selectedNames}
                onToggle={toggleRef}
                emptyLabel={t('mediaLibraryEmpty')}
                toggleAriaLabel={(name) => t('mediaToggleAria', { name })}
              />
            )}
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange(draft)
                setPickerOpen(false)
              }}
            >
              {t('mediaConfirm', { count: draft.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Field>
  )
}
