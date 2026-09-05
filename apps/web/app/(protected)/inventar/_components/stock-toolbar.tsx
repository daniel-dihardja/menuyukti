'use client'

import { useTranslations } from 'next-intl'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { INVENTAR_ASSISTANT_OPEN_ID } from './inventar-assistant-panel'
import type { InventarBranch } from './stock-utils'

type Props = {
  branches: InventarBranch[]
  locationId: number | null
  onLocationChange: (id: number | null) => void
  canBookDelivery: boolean
  onBookDelivery: () => void
  onOpenAssistant: () => void
  totalValueLabel: string | null
}

export function StockToolbar({
  branches,
  locationId,
  onLocationChange,
  canBookDelivery,
  onBookDelivery,
  onOpenAssistant,
  totalValueLabel,
}: Props) {
  const t = useTranslations('inventar')

  return (
    <>
      <p className="hidden text-pretty text-sm text-muted-foreground sm:block">{t('trustLine')}</p>

      <div
        className={cn(
          'sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur',
          'lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
        )}
      >
        {branches.length > 0 ? (
          <LocationSelect
            branches={branches}
            value={locationId}
            onValueChange={onLocationChange}
            id="inventar-location-select"
            label={t('branchLabel')}
            placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
            description={t('branchDescription')}
            className="w-full max-w-none sm:max-w-xs"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="min-h-11 w-full touch-manipulation sm:w-auto lg:min-h-9"
            disabled={!canBookDelivery}
            onClick={onBookDelivery}
          >
            {t('bookDelivery')}
          </Button>
          <Button
            type="button"
            id={INVENTAR_ASSISTANT_OPEN_ID}
            variant="outline"
            className="min-h-11 w-full touch-manipulation sm:w-auto lg:min-h-9"
            onClick={onOpenAssistant}
          >
            {t('assistantOpen')}
          </Button>
          {totalValueLabel != null ? (
            <p className="w-full text-sm tabular-nums text-muted-foreground sm:ml-auto sm:w-auto">
              {t('totalValue')}:{' '}
              <span className="font-medium text-foreground">{totalValueLabel}</span>
            </p>
          ) : null}
        </div>
      </div>
    </>
  )
}
