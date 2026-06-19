'use client'

import {
  formatLift,
  SLOT_INDEX_GAUGE_MAX,
  SLOT_INDEX_GAUGE_MIN,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { RelativeDemand } from '@/lib/graphql/queries/analytics'
import { cn } from '@workspace/ui/lib/utils'

const PROMOTE_THRESHOLD = 0.9
const SUPPORT_THRESHOLD = 1.1
const BASELINE = 1

type MenuCombosSlotIndexGaugeProps = {
  label: string
  value: number
  locale: string
  /** Shorter track height for list rows in the day explorer. */
  compact?: boolean
  /** When set, shows a tier chip beside the formatted value. */
  venueTier?: RelativeDemand | null
  tierLabels?: {
    low: string
    average: string
    high: string
  }
  ariaLabel?: string
}

function clampValue(value: number): number {
  return Math.min(SLOT_INDEX_GAUGE_MAX, Math.max(SLOT_INDEX_GAUGE_MIN, value))
}

function valueToPercent(value: number): number {
  const clamped = clampValue(value)
  const range = SLOT_INDEX_GAUGE_MAX - SLOT_INDEX_GAUGE_MIN
  return ((clamped - SLOT_INDEX_GAUGE_MIN) / range) * 100
}

function baselinePercent(): number {
  return valueToPercent(BASELINE)
}

function tierChipLabel(
  tier: RelativeDemand,
  tierLabels: MenuCombosSlotIndexGaugeProps['tierLabels'],
): string | null {
  if (!tierLabels) return null
  switch (tier) {
    case 'low':
      return tierLabels.low
    case 'high':
      return tierLabels.high
    default:
      return tierLabels.average
  }
}

function tierChipClassName(tier: RelativeDemand): string {
  switch (tier) {
    case 'low':
      return 'text-amber-800 dark:text-amber-300'
    case 'high':
      return 'text-emerald-700 dark:text-emerald-400'
    default:
      return 'text-muted-foreground'
  }
}

export function MenuCombosSlotIndexGauge({
  label,
  value,
  locale,
  compact = false,
  venueTier,
  tierLabels,
  ariaLabel,
}: MenuCombosSlotIndexGaugeProps) {
  const markerPct = valueToPercent(value)
  const baselinePct = baselinePercent()
  const promoteEndPct = valueToPercent(PROMOTE_THRESHOLD)
  const supportStartPct = valueToPercent(SUPPORT_THRESHOLD)
  const tierLabel = venueTier ? tierChipLabel(venueTier, tierLabels) : null

  return (
    <div className={cn('flex flex-col gap-1.5', compact && 'gap-1')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'font-semibold tabular-nums tracking-tight',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {formatLift(value, locale)}×
          </span>
          {tierLabel ? (
            <span className={cn('text-xs', tierChipClassName(venueTier!))}>{tierLabel}</span>
          ) : null}
        </div>
      </div>

      <div
        className={cn('relative w-full', compact ? 'h-1.5' : 'h-2.5')}
        role="meter"
        aria-label={ariaLabel ?? `${label}: ${formatLift(value, locale)}×`}
        aria-valuenow={value}
        aria-valuemin={SLOT_INDEX_GAUGE_MIN}
        aria-valuemax={SLOT_INDEX_GAUGE_MAX}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="absolute inset-y-0 left-0 bg-amber-500/15"
            style={{ width: `${promoteEndPct}%` }}
          />
          <div
            className="absolute inset-y-0 bg-muted/80"
            style={{ left: `${promoteEndPct}%`, width: `${supportStartPct - promoteEndPct}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-emerald-500/15"
            style={{ width: `${100 - supportStartPct}%` }}
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/30"
          style={{ left: `${baselinePct}%` }}
          aria-hidden
        />

        <div
          className={cn(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-2 ring-background',
            compact ? 'size-2' : 'size-2.5',
          )}
          style={{ left: `${markerPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  )
}
