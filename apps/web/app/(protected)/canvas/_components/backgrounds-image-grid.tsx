'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Download, ImageIcon, Maximize2, Sparkles } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Textarea } from '@workspace/ui/components/textarea'

import type { BackgroundItem } from '@/lib/assets/backgrounds'
import {
  ASSETS_GRID_SKELETON_COUNT,
  assetBackgroundDownloadHref,
  formatBytes,
  formatDimensions,
} from './asset-item-types'

const assetTileOverlayReveal =
  'opacity-100 transition-opacity duration-300 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100'

const overlayIconButtonBase =
  'h-11 w-11 shrink-0 touch-manipulation rounded-full shadow-md transition-transform duration-150 active:scale-[0.97] sm:h-9 sm:w-9 sm:active:scale-100'

export type BackgroundsImageGridProps = {
  loading: boolean
  items: BackgroundItem[]
  imageDimensionsByName: Record<string, { width: number; height: number }>
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onPreview: (item: BackgroundItem) => void
  bgCardFlows: Record<string, string>
  onBgCardFlowChange: (name: string, value: string) => void
  bgCardCustomPrompts: Record<string, string>
  onBgCardCustomPromptChange: (name: string, value: string) => void
  onGenerate: (item: BackgroundItem) => void
  skeletonCount?: number
}

export function BackgroundsImageGrid({
  loading,
  items,
  imageDimensionsByName,
  onImageNaturalSize,
  onPreview,
  bgCardFlows,
  onBgCardFlowChange,
  bgCardCustomPrompts,
  onBgCardCustomPromptChange,
  onGenerate,
  skeletonCount = ASSETS_GRID_SKELETON_COUNT,
}: BackgroundsImageGridProps) {
  const t = useTranslations('assets')
  const format = useFormatter()

  return (
    <section className="w-full">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
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
            <h3 className="text-lg font-medium">{t('backgrounds.empty.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('backgrounds.empty.description')}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {items.map((item) => {
            const dimensions = formatDimensions(
              imageDimensionsByName[item.name]?.width,
              imageDimensionsByName[item.name]?.height,
            )
            const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`
            return (
              <figure
                key={item.key}
                className="group/tile min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URLs; dimensions vary */}
                  <img
                    src={item.url}
                    alt=""
                    width={400}
                    height={300}
                    loading="lazy"
                    className="size-full object-cover transition duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:scale-[1.02]"
                    onLoad={(e) => {
                      const width = e.currentTarget.naturalWidth
                      const height = e.currentTarget.naturalHeight
                      onImageNaturalSize(item.name, width, height)
                    }}
                  />
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent ${assetTileOverlayReveal}`}
                  />
                  <div
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${assetTileOverlayReveal}`}
                  >
                    <figcaption className="min-w-0 flex-1 truncate text-left text-xs font-medium text-white drop-shadow">
                      {item.name}
                    </figcaption>
                    <div className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className={`${overlayIconButtonBase} bg-white/95 text-neutral-950 hover:bg-white hover:text-neutral-950`}
                        aria-label={t('grid.viewLarge')}
                        onClick={() => onPreview(item)}
                      >
                        <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className={`${overlayIconButtonBase} bg-white/95 text-neutral-950 hover:bg-white hover:text-neutral-950`}
                        aria-label={t('grid.download')}
                        asChild
                      >
                        <a
                          href={assetBackgroundDownloadHref(item.name)}
                          download={item.name}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-5 w-5 sm:h-4 sm:w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
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
                      htmlFor={`background-flow-${item.name}`}
                      className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
                    >
                      {t('grid.generate.flowLabel')}
                    </FieldLabel>
                    <Select
                      value={bgCardFlows[item.name] ?? 'none'}
                      onValueChange={(value) => {
                        onBgCardFlowChange(item.name, value)
                      }}
                    >
                      <SelectTrigger
                        id={`background-flow-${item.name}`}
                        size="sm"
                        className="w-full"
                      >
                        <SelectValue placeholder={t('grid.generate.flowPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent
                        align="start"
                        position="popper"
                        className="min-w-[var(--radix-select-trigger-width)]"
                      >
                        <SelectItem value="none">{t('upload.flow.none')}</SelectItem>
                        <SelectItem value="custom">{t('grid.generate.customOption')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {(bgCardFlows[item.name] ?? 'none') === 'custom' ? (
                    <Field className="gap-1.5">
                      <FieldLabel
                        htmlFor={`background-custom-prompt-${item.name}`}
                        className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
                      >
                        {t('grid.generate.customPromptLabel')}
                      </FieldLabel>
                      <Textarea
                        id={`background-custom-prompt-${item.name}`}
                        value={bgCardCustomPrompts[item.name] ?? ''}
                        onChange={(e) => {
                          onBgCardCustomPromptChange(item.name, e.target.value)
                        }}
                        placeholder={t('grid.generate.customPromptPlaceholder')}
                        rows={3}
                      />
                    </Field>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={
                      (bgCardFlows[item.name] ?? 'none') === 'none' ||
                      ((bgCardFlows[item.name] ?? 'none') === 'custom' &&
                        (bgCardCustomPrompts[item.name]?.trim() ?? '').length === 0)
                    }
                    onClick={() => void onGenerate(item)}
                  >
                    <Sparkles data-icon="inline-start" />
                    {t('grid.generate.button')}
                  </Button>
                </div>
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}
