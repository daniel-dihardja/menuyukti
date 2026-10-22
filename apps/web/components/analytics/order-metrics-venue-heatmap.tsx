'use client'

import { useTranslations } from 'next-intl'

import { VenueDemandHeatmap } from '@/components/analytics/venue-demand-heatmap'
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
    <VenueDemandHeatmap
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
