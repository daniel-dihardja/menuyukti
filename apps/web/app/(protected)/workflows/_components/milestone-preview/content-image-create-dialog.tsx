'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import type { BackgroundItem } from '@/lib/assets/backgrounds'

type AssetItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

type ContentImageCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SelectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  )
}

export function ContentImageCreateDialog({ open, onOpenChange }: ContentImageCreateDialogProps) {
  const t = useTranslations('analytics.campaigns.chat.contentImageDialog')

  const [products, setProducts] = useState<AssetItem[]>([])
  const [backgrounds, setBackgrounds] = useState<BackgroundItem[]>([])
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([])
  const [selectedBackgroundName, setSelectedBackgroundName] = useState<string | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedProductNames([])
      setSelectedBackgroundName(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoadingProducts(true)
    setLoadingBackgrounds(true)
    setError(null)

    void Promise.all([
      fetch('/api/assets/list', { cache: 'no-store' }),
      fetch('/api/assets/backgrounds/list', { cache: 'no-store' }),
    ])
      .then(async ([productsRes, backgroundsRes]) => {
        if (!productsRes.ok || !backgroundsRes.ok) {
          throw new Error('load_error')
        }
        const productsBody = (await productsRes.json()) as { items?: AssetItem[] }
        const backgroundsBody = (await backgroundsRes.json()) as { items?: BackgroundItem[] }
        if (cancelled) return
        setProducts(productsBody.items ?? [])
        setBackgrounds(backgroundsBody.items ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setProducts([])
        setBackgrounds([])
        setError(t('loadError'))
      })
      .finally(() => {
        if (cancelled) return
        setLoadingProducts(false)
        setLoadingBackgrounds(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-3xl flex-col gap-0 rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <DialogHeader className="shrink-0 border-b px-4 py-4 text-left sm:px-6">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('descriptionSelect')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-5">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t('productsLabel')}</p>
                <Badge variant="secondary">
                  {t('productsSelectedCount', { count: selectedProductNames.length })}
                </Badge>
              </div>
              {loadingProducts ? (
                <SelectionSkeleton />
              ) : products.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('productsEmpty')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {products.map((item) => {
                    const selected = selectedProductNames.includes(item.name)
                    return (
                      <button
                        key={item.name}
                        type="button"
                        className={cn(
                          'group relative overflow-hidden rounded-lg border bg-card text-left transition',
                          selected ? 'border-primary ring-2 ring-ring/50' : 'border-border',
                        )}
                        onClick={() =>
                          setSelectedProductNames((prev) =>
                            prev.includes(item.name)
                              ? prev.filter((name) => name !== item.name)
                              : [...prev, item.name],
                          )
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                        <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1">
                          {selected ? <Check className="size-4 text-primary" /> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <Separator />

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t('backgroundLabel')}</p>
                <Badge variant="secondary">
                  {selectedBackgroundName ? t('backgroundSelected') : t('backgroundNotSelected')}
                </Badge>
              </div>
              {loadingBackgrounds ? (
                <SelectionSkeleton />
              ) : backgrounds.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('backgroundsEmpty')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {backgrounds.map((item) => {
                    const selected = selectedBackgroundName === item.name
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={cn(
                          'group relative overflow-hidden rounded-lg border bg-card text-left transition',
                          selected ? 'border-primary ring-2 ring-ring/50' : 'border-border',
                        )}
                        onClick={() =>
                          setSelectedBackgroundName((prev) =>
                            prev === item.name ? null : item.name,
                          )
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                        <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1">
                          {selected ? <Check className="size-4 text-primary" /> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="sticky bottom-0 shrink-0 border-t bg-background px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
