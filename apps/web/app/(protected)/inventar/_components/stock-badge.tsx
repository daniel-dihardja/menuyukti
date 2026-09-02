'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'

export type StockLevelStatus = 'low' | 'ok' | 'over'

export function stockLevelStatus(
  onHand: number,
  minOnHand: number | null | undefined,
  maxOnHand: number | null | undefined,
): StockLevelStatus {
  if (minOnHand != null && onHand <= minOnHand) return 'low'
  if (maxOnHand != null && onHand >= maxOnHand) return 'over'
  return 'ok'
}

export function StockBadge({
  onHand,
  packagesLabel,
  minOnHand,
  maxOnHand,
}: {
  onHand: number
  packagesLabel: string
  minOnHand?: number | null
  maxOnHand?: number | null
}) {
  const t = useTranslations('inventar')
  const status = stockLevelStatus(onHand, minOnHand, maxOnHand)
  const variant = status === 'low' ? 'destructive' : status === 'over' ? 'outline' : 'secondary'
  const statusLabel =
    status === 'low' ? t('stockStatusLow') : status === 'over' ? t('stockStatusOver') : null

  return (
    <Badge
      variant={variant}
      className="tabular-nums"
      title={statusLabel ?? undefined}
      aria-label={statusLabel ? `${onHand} ${packagesLabel}, ${statusLabel}` : undefined}
    >
      {onHand} {packagesLabel}
    </Badge>
  )
}
