'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Download, ImageIcon, Loader2, Maximize2, Sparkles, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
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

import { AiFlowSelectOption } from './ai-flow-select-option'
import {
  ASSETS_GRID_SKELETON_COUNT,
  type AssetItem,
  formatBytes,
  formatDimensions,
} from './asset-item-types'
import {
  AssetsImageGridProvider,
  useAssetsImageGridActions,
  useAssetsImageGridState,
} from './assets-image-grid-context'

/** Visible on touch; fade-in on hover only when the device supports real hover (not mobile tap). */
const assetTileOverlayReveal =
  'opacity-100 transition-opacity duration-300 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100'

const overlayIconButtonBase =
  'h-11 w-11 shrink-0 touch-manipulation rounded-full shadow-md transition-transform duration-150 active:scale-[0.97] sm:h-9 sm:w-9 sm:active:scale-100'

function AssetsImageGridRoot({ children }: { children: ReactNode }) {
  return <section className="w-full">{children}</section>
}

function AssetsImageGridLoading({
  skeletonCount = ASSETS_GRID_SKELETON_COUNT,
}: {
  skeletonCount?: number
}) {
  return (
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
  )
}

function AssetsImageGridEmpty() {
  const t = useTranslations('assets')
  const { emptyTitle, emptyDescription } = useAssetsImageGridState()

  return (
    <Card className="border-dashed bg-muted/20 py-16 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{emptyTitle ?? t('grid.empty.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {emptyDescription ?? t('grid.empty.description')}
        </p>
      </div>
    </Card>
  )
}

function AssetsImageGridList({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">{children}</div>
  )
}

function AssetsImageGridTilePreviewButton({ item }: { item: AssetItem }) {
  const t = useTranslations('assets')
  const { onPreview } = useAssetsImageGridActions()

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={`${overlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
      aria-label={t('grid.viewLarge')}
      onClick={() => onPreview(item)}
    >
      <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />
    </Button>
  )
}

function AssetsImageGridTileDownloadButton({ item }: { item: AssetItem }) {
  const t = useTranslations('assets')
  const { downloadHrefForName } = useAssetsImageGridState()

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={`${overlayIconButtonBase} bg-background/95 text-foreground hover:bg-background hover:text-foreground`}
      aria-label={t('grid.download')}
      asChild
    >
      <a
        href={downloadHrefForName(item.name)}
        download={item.name}
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="h-5 w-5 sm:h-4 sm:w-4" />
      </a>
    </Button>
  )
}

function AssetsImageGridTileDeleteButton({ item }: { item: AssetItem }) {
  const t = useTranslations('assets')
  const { deleting } = useAssetsImageGridState()
  const { onDeleteRequest } = useAssetsImageGridActions()

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={`${overlayIconButtonBase} bg-white/95 text-destructive hover:bg-white`}
      disabled={deleting === item.name}
      aria-label={t('grid.delete')}
      onClick={(e) => {
        e.stopPropagation()
        onDeleteRequest(item.name)
      }}
    >
      {deleting === item.name ? (
        <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
      ) : (
        <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
      )}
    </Button>
  )
}

function AssetsImageGridTileGeneratePanel({ item }: { item: AssetItem }) {
  const t = useTranslations('assets')
  const { cardFlows, cardCustomPrompts, aiFlows, flowsLoading, generatingByName } =
    useAssetsImageGridState()
  const { onCardFlowChange, onCardCustomPromptChange, onGenerate } = useAssetsImageGridActions()

  return (
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
            onCardFlowChange(item.name, value)
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
                <AiFlowSelectOption displayName={flow.displayName} category={flow.category} />
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
              onCardCustomPromptChange(item.name, e.target.value)
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
  )
}

function AssetsImageGridTile({
  item,
  overlayActions,
}: {
  item: AssetItem
  overlayActions: ReactNode
}) {
  const format = useFormatter()
  const { imageDimensionsByName } = useAssetsImageGridState()
  const { onImageNaturalSize } = useAssetsImageGridActions()

  const dimensions = formatDimensions(
    imageDimensionsByName[item.name]?.width,
    imageDimensionsByName[item.name]?.height,
  )
  const sizeWithDimensions = `${formatBytes(item.size)}${dimensions ? ` - ${dimensions}` : ''}`

  return (
    <figure className="group/tile min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30 text-left">
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */}
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
            {overlayActions}
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
      <AssetsImageGridTileGeneratePanel item={item} />
    </figure>
  )
}

function AssetsImageGridDeletableView() {
  const { loading, items } = useAssetsImageGridState()

  if (loading) {
    return (
      <AssetsImageGridRoot>
        <AssetsImageGridLoading />
      </AssetsImageGridRoot>
    )
  }

  if (items.length === 0) {
    return (
      <AssetsImageGridRoot>
        <AssetsImageGridEmpty />
      </AssetsImageGridRoot>
    )
  }

  return (
    <AssetsImageGridRoot>
      <AssetsImageGridList>
        {items.map((item) => (
          <AssetsImageGridTile
            key={item.name}
            item={item}
            overlayActions={
              <>
                <AssetsImageGridTilePreviewButton item={item} />
                <AssetsImageGridTileDownloadButton item={item} />
                <AssetsImageGridTileDeleteButton item={item} />
              </>
            }
          />
        ))}
      </AssetsImageGridList>
    </AssetsImageGridRoot>
  )
}

function AssetsImageGridReadOnlyView() {
  const { loading, items } = useAssetsImageGridState()

  if (loading) {
    return (
      <AssetsImageGridRoot>
        <AssetsImageGridLoading />
      </AssetsImageGridRoot>
    )
  }

  if (items.length === 0) {
    return (
      <AssetsImageGridRoot>
        <AssetsImageGridEmpty />
      </AssetsImageGridRoot>
    )
  }

  return (
    <AssetsImageGridRoot>
      <AssetsImageGridList>
        {items.map((item) => (
          <AssetsImageGridTile
            key={item.name}
            item={item}
            overlayActions={
              <>
                <AssetsImageGridTilePreviewButton item={item} />
                <AssetsImageGridTileDownloadButton item={item} />
              </>
            }
          />
        ))}
      </AssetsImageGridList>
    </AssetsImageGridRoot>
  )
}

export const AssetsImageGrid = {
  Provider: AssetsImageGridProvider,
  Root: AssetsImageGridRoot,
  Loading: AssetsImageGridLoading,
  Empty: AssetsImageGridEmpty,
  List: AssetsImageGridList,
  Tile: AssetsImageGridTile,
  TilePreviewButton: AssetsImageGridTilePreviewButton,
  TileDownloadButton: AssetsImageGridTileDownloadButton,
  TileDeleteButton: AssetsImageGridTileDeleteButton,
  TileGeneratePanel: AssetsImageGridTileGeneratePanel,
  DeletableView: AssetsImageGridDeletableView,
  ReadOnlyView: AssetsImageGridReadOnlyView,
}

export { AssetsImageGridProvider } from './assets-image-grid-context'
