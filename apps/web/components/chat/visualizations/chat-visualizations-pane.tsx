'use client'

import dynamic from 'next/dynamic'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'

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
    default:
      return null
  }
}

export function ChatVisualizationsPane() {
  const t = useTranslations('chat.visualizations')
  const tSales = useTranslations('chat.salesReport')
  const { analyticsRunId, locationId } = useChatVisualizationsState()
  const { addedIds, addVisualization, removeVisualization, hydrated } = useChatVisualizationsState()

  const hasSalesReport = analyticsRunId !== null
  const availableEntries = hasSalesReport ? getAvailableCatalogEntries(addedIds) : []
  const canAdd = availableEntries.length > 0

  if (!hydrated) {
    return null
  }

  if (!hasSalesReport) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <h2 className="text-balance font-medium text-sm">{t('panelTitle')}</h2>
        <Empty className="flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('noAnalyticsRunTitle')}</EmptyTitle>
            <EmptyDescription>{tSales('attachHint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
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
        <Empty className="flex-1 border border-dashed">
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
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {addedIds.map((id) => (
            <Card className="shrink-0" key={id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="min-w-0 flex-1 truncate text-sm">
                  {t(`catalog.${id}.title`)}
                </CardTitle>
                <Button
                  aria-label={t('removeAriaLabel', { title: t(`catalog.${id}.title`) })}
                  className="size-8 shrink-0"
                  onClick={() => removeVisualization(id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <VisualizationCardBody
                  analyticsRunId={analyticsRunId}
                  id={id}
                  locationId={locationId}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
