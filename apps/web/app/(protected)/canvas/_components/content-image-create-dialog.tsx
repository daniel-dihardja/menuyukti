'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Sparkles } from 'lucide-react'

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
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import type { BackgroundItem } from '@/lib/assets/backgrounds'
import {
  loadDesignCreateCatalog,
  type AssetCatalogItem,
  type AssetFlowOption,
} from '@/lib/assets/client-api'

import { AiFlowSelectOption } from './ai-flow-select-option'

type ContentImageCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDesignCreated?: (item: AssetCatalogItem) => void
  onGeneratingChange?: (generating: boolean) => void
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

export function ContentImageCreateDialog({
  open,
  onOpenChange,
  onDesignCreated,
  onGeneratingChange,
}: ContentImageCreateDialogProps) {
  const t = useTranslations('analytics.workflows.chat.contentImageDialog')

  const [products, setProducts] = useState<AssetCatalogItem[]>([])
  const [backgrounds, setBackgrounds] = useState<BackgroundItem[]>([])
  const [flows, setFlows] = useState<AssetFlowOption[]>([])
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([])
  const [selectedBackgroundName, setSelectedBackgroundName] = useState<string | null>(null)
  const [selectedFlowSlug, setSelectedFlowSlug] = useState<string>('')
  const [selectedFormat, setSelectedFormat] = useState<string>('1:1')
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false)
  const [loadingFlows, setLoadingFlows] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canGenerate =
    selectedProductNames.length > 0 &&
    selectedBackgroundName !== null &&
    selectedFlowSlug.trim().length > 0 &&
    !isGenerating

  useEffect(() => {
    if (!open) {
      setSelectedProductNames([])
      setSelectedBackgroundName(null)
      setSelectedFlowSlug('')
      setSelectedFormat('1:1')
      setError(null)
      return
    }

    let cancelled = false
    setLoadingProducts(true)
    setLoadingBackgrounds(true)
    setLoadingFlows(true)
    setError(null)

    void loadDesignCreateCatalog()
      .then((catalog) => {
        if (cancelled) return
        setProducts(catalog.products)
        setBackgrounds(catalog.backgrounds)
        setFlows(catalog.flows)
        setSelectedFlowSlug(catalog.flows[0]?.slug ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setProducts([])
        setBackgrounds([])
        setFlows([])
        setSelectedFlowSlug('')
        setError(t('loadError'))
      })
      .finally(() => {
        if (cancelled) return
        setLoadingProducts(false)
        setLoadingBackgrounds(false)
        setLoadingFlows(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, t])

  useEffect(() => {
    onGeneratingChange?.(isGenerating)
  }, [isGenerating, onGeneratingChange])

  const handleGenerate = async () => {
    const productName = selectedProductNames[0]
    const backgroundName = selectedBackgroundName
    if (!productName || !backgroundName || !selectedFlowSlug || isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/assets/designs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          backgroundName,
          flow: selectedFlowSlug,
        }),
      })
      if (!res.ok) {
        throw new Error('generate')
      }
      const created = (await res.json()) as AssetCatalogItem
      onDesignCreated?.(created)
      onOpenChange(false)
    } catch {
      setError(t('generateError'))
    } finally {
      setIsGenerating(false)
    }
  }

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

            <Separator />

            <section className="flex flex-col gap-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="content-image-flow" className="text-sm font-medium">
                  {t('flowLabel')}
                </FieldLabel>
                {loadingFlows ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : flows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('flowsEmpty')}</p>
                ) : (
                  <Select
                    value={selectedFlowSlug}
                    onValueChange={setSelectedFlowSlug}
                    disabled={loadingFlows}
                  >
                    <SelectTrigger id="content-image-flow" size="default" className="w-full">
                      <SelectValue placeholder={t('flowPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      position="popper"
                      className="min-w-[var(--radix-select-trigger-width)]"
                    >
                      {flows.map((flow) => (
                        <SelectItem key={flow.slug} value={flow.slug} className="cursor-pointer">
                          <AiFlowSelectOption
                            displayName={flow.displayName}
                            category={flow.category}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </section>

            <section className="flex flex-col gap-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="content-image-format" className="text-sm font-medium">
                  {t('formatLabel')}
                </FieldLabel>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger id="content-image-format" size="default" className="w-full">
                    <SelectValue placeholder={t('formatPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    position="popper"
                    className="min-w-[var(--radix-select-trigger-width)]"
                  >
                    <SelectItem value="1:1">1:1 - Square</SelectItem>
                    <SelectItem value="2:3">2:3 - Portrait</SelectItem>
                    <SelectItem value="3:2">3:2 - Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto shrink-0 border-t bg-background px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            {t('cancel')}
          </Button>
          <Button type="button" disabled={!canGenerate} onClick={handleGenerate}>
            {isGenerating ? (
              <>
                <Spinner data-icon="inline-start" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" />
                {t('generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
