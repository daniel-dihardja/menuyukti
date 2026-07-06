'use client'

import { useTranslations } from 'next-intl'

import { MenuCombosVenueDemandHeatmap } from '../../menu-combos/_components/menu-combos-venue-demand-heatmap'
import type { SlotDemandCell } from '@/lib/graphql/queries/analytics'

type OrderMetricsVenueHeatmapProps = {
  slotDemandProfile: SlotDemandCell[]
  locale: string
}

export function OrderMetricsVenueHeatmap({
  slotDemandProfile,
  locale,
}: OrderMetricsVenueHeatmapProps) {
  const tDays = useTranslations('analytics.shared.orderMetrics.days')

  return (
    <MenuCombosVenueDemandHeatmap
      slotDemandProfile={slotDemandProfile}
      locale={locale}
      highlightCell={null}
      weekdayLabel={(day) => tDays(day as 'mon')}
      translationNamespace="analytics.orderMetrics"
      translationPrefix="venueHeatmap"
      gaugePrefix="venueHeatmap.gauge"
      collapsibleOnMobile={false}
    />
  )
}
