'use client'

import dynamic from 'next/dynamic'
import { ChevronDown, Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { cn } from '@workspace/ui/lib/utils'

import { useChatVisualizationsState } from './chat-visualizations-context'
import { getAvailableCatalogEntries, type ChatVisualizationId } from './chat-visualization-catalog'

const MenuItemHeatmapCard = dynamic(
  () => import('./menu-item-heatmap-card').then((m) => m.MenuItemHeatmapCard),
  { ssr: false },
)
const PairLiftMatrixCard = dynamic(
  () => import('./pair-lift-matrix-card').then((m) => m.PairLiftMatrixCard),
  { ssr: false },
)
const VenueSlotStrengthCard = dynamic(
  () => import('./venue-slot-strength-card').then((m) => m.VenueSlotStrengthCard),
  { ssr: false },
)
const LowEndReviewCard = dynamic(
  () => import('./low-end-review-card').then((m) => m.LowEndReviewCard),
  { ssr: false },
)

function VisualizationCardBody({
  id,
  analyticsRunId,
  locationId,
}: {
  id: ChatVisualizationId
  analyticsRunId: number | null
  locationId: number
}) {
  switch (id) {
    case 'venue_slot_strength_heatmap':
      return <VenueSlotStrengthCard analyticsRunId={analyticsRunId} locationId={locationId} />
    case 'menu_item_heatmap':
      return <MenuItemHeatmapCard analyticsRunId={analyticsRunId} locationId={locationId} />
    case 'pair_lift_matrix_heatmap':
      return <PairLiftMatrixCard analyticsRunId={analyticsRunId} locationId={locationId} />
    case 'low_end_review':
      return <LowEndReviewCard analyticsRunId={analyticsRunId} locationId={locationId} />
    default:
      return null
  }
}

export function ChatVisualizationsPane() {
  const t = useTranslations('chat.visualizations')
  const tSales = useTranslations('chat.salesReport')
  const {
    analyticsRunId,
    locationId,
    addedIds,
    collapsedIds,
    addVisualization,
    removeVisualization,
    setVisualizationExpanded,
    hydrated,
  } = useChatVisualizationsState()

  const hasSalesReport = analyticsRunId !== null
  const availableEntries = hasSalesReport ? getAvailableCatalogEntries(addedIds) : []
  const canAdd = availableEntries.length > 0

  if (!hydrated) {
    return null
  }

  if (!hasSalesReport) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <h2 className="shrink-0 text-balance font-medium text-sm">{t('panelTitle')}</h2>
        <Empty className="min-h-0 flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('noAnalyticsRunTitle')}</EmptyTitle>
            <EmptyDescription>{tSales('attachHint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-balance font-medium text-sm">{t('panelTitle')}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t('addMenuAriaLabel')}
              disabled={!canAdd}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus aria-hidden className="size-4" />
              {t('addButton')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {availableEntries.map((entry) => (
              <DropdownMenuItem key={entry.id} onSelect={() => addVisualization(entry.id)}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{t(`catalog.${entry.id}.title`)}</span>
                  <span className="text-muted-foreground text-xs">
                    {t(`catalog.${entry.id}.description`)}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {addedIds.length === 0 ? (
        <Empty className="min-h-0 flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('emptyDescription')}</EmptyDescription>
          </EmptyHeader>
          {canAdd ? (
            <Button onClick={() => addVisualization(availableEntries[0]!.id)} type="button">
              <Plus aria-hidden className="size-4" />
              {t('addButton')}
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-4 pb-2">
            {addedIds.map((id) => {
              const title = t(`catalog.${id}.title`)
              const open = !collapsedIds.includes(id)
              return (
                <Collapsible
                  key={id}
                  onOpenChange={(nextOpen) => setVisualizationExpanded(id, nextOpen)}
                  open={open}
                >
                  <Card className="shrink-0">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          aria-label={
                            open
                              ? t('collapseAriaLabel', { title })
                              : t('expandAriaLabel', { title })
                          }
                          className="h-auto min-w-0 flex-1 justify-start gap-2 px-0 py-0 text-left hover:bg-transparent"
                          type="button"
                          variant="ghost"
                        >
                          <ChevronDown
                            aria-hidden
                            className={cn(
                              'text-muted-foreground size-4 shrink-0 transition-transform',
                              open && 'rotate-180',
                            )}
                          />
                          <CardTitle className="min-w-0 flex-1 truncate text-sm">{title}</CardTitle>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        aria-label={t('removeAriaLabel', { title })}
                        className="size-8 shrink-0"
                        onClick={(event) => {
                          event.stopPropagation()
                          removeVisualization(id)
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <X aria-hidden className="size-4" />
                      </Button>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <VisualizationCardBody
                          analyticsRunId={analyticsRunId}
                          id={id}
                          locationId={locationId}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
