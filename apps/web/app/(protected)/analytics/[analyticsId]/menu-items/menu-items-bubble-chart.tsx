'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'd3-format'
import { hierarchy, pack } from 'd3-hierarchy'
import { scaleOrdinal } from 'd3-scale'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

import { formatCurrencyWithCode } from '@/lib/currency'
import type { MenuItemsDisplayRow } from '@/lib/analytics/menu-items-page-adapter'

type Props = {
  rows: MenuItemsDisplayRow[]
  locale: string
  currency: string
}

type BubbleData = {
  id: string
  group: string
  menuItem: string
  category: string
  subCategory: string
  quantity: number
  totalRevenue: number
}

type BubbleHierarchyDatum = BubbleData | { children: BubbleData[] }
type BubbleSizeMetric = 'quantity' | 'revenue'

const CHART_SIZE = 928
const CHART_MARGIN = 1
// Intentionally soft palette for category background separation in bubbles.
const CATEGORY_BUBBLE_COLORS = [
  '#CFE8FF',
  '#CFF6E8',
  '#FFE3C2',
  '#DDD3FF',
  '#FFCFE1',
  '#C9F1EA',
  '#FFF0B8',
  '#D7E9D9',
  '#D6E6FF',
  '#E7D6FF',
  '#FFDCCF',
  '#CCF8E4',
] as const

function normalizeIdPart(value: string): string {
  return value.trim().replaceAll('.', '_').replaceAll(' ', '_')
}

function buildBubbleData(rows: MenuItemsDisplayRow[]): BubbleData[] {
  const map = new Map<string, BubbleData>()

  for (const row of rows) {
    const category = row.category || 'Uncategorized'
    const subCategory = row.subCategory || '—'
    const menuItem = row.menuItem || 'Unknown'
    const key = `${category}::${subCategory}::${menuItem}`
    const existing = map.get(key)

    if (existing) {
      existing.quantity += row.quantity
      existing.totalRevenue += row.totalRevenue
      continue
    }

    map.set(key, {
      id: `root.${normalizeIdPart(category)}.${normalizeIdPart(subCategory)}.${normalizeIdPart(menuItem)}`,
      group: category,
      menuItem,
      category,
      subCategory,
      quantity: row.quantity,
      totalRevenue: row.totalRevenue,
    })
  }

  return Array.from(map.values())
}

export function MenuItemsBubbleChart({ rows, locale, currency }: Props) {
  const t = useTranslations('analytics.menuItems')
  const formatNumber = useMemo(() => format(',d'), [])
  const [sizeMetric, setSizeMetric] = useState<BubbleSizeMetric>('quantity')

  const chart = useMemo(() => {
    const data = buildBubbleData(rows)
    if (data.length === 0) {
      return null
    }

    const categoryDomain = Array.from(new Set(data.map((item) => item.group))).sort((a, b) =>
      a.localeCompare(b),
    )
    const color = scaleOrdinal<string, string>(categoryDomain, CATEGORY_BUBBLE_COLORS)
    const packedLayout = pack<BubbleHierarchyDatum>()
      .size([CHART_SIZE - CHART_MARGIN * 2, CHART_SIZE - CHART_MARGIN * 2])
      .padding(3)

    const root = packedLayout(
      hierarchy<BubbleHierarchyDatum>({ children: data }).sum((d) => {
        if (!('quantity' in d)) {
          return 0
        }
        return sizeMetric === 'quantity' ? d.quantity : d.totalRevenue
      }),
    )

    const leaves = root.leaves()

    return {
      leaves,
      color,
    }
  }, [rows, sizeMetric])

  if (!chart) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {t('chart.empty')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card p-2 shadow-sm">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <p className="text-xs font-medium text-muted-foreground">{t('chart.sizeMetricLabel')}</p>
        <ToggleGroup
          type="single"
          value={sizeMetric}
          onValueChange={(value) => {
            if (value === 'quantity' || value === 'revenue') {
              setSizeMetric(value)
            }
          }}
          aria-label={t('chart.sizeMetricLabel')}
        >
          <ToggleGroupItem value="quantity">{t('chart.sizeMetricQuantity')}</ToggleGroupItem>
          <ToggleGroupItem value="revenue">{t('chart.sizeMetricRevenue')}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <svg
        width={CHART_SIZE}
        height={CHART_SIZE}
        viewBox={`${-CHART_MARGIN} ${-CHART_MARGIN} ${CHART_SIZE} ${CHART_SIZE}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={
          sizeMetric === 'quantity' ? t('chart.ariaLabelQuantity') : t('chart.ariaLabelRevenue')
        }
      >
        <g>
          {chart.leaves.map((leaf) => {
            const { x, y, r } = leaf
            const data = leaf.data as BubbleData
            const words = data.menuItem.split(/(?=[A-Z][a-z])|\s+/g).filter(Boolean)
            const quantityLabel = formatNumber(data.quantity)
            const revenueLabel = formatCurrencyWithCode(data.totalRevenue, currency, locale)

            return (
              <g key={data.id} transform={`translate(${x},${y})`}>
                <title>
                  {`${data.menuItem} (${data.category} / ${data.subCategory})\n${t('qty')}: ${quantityLabel}\n${t('table.revenue')}: ${revenueLabel}`}
                </title>
                <circle
                  r={r}
                  fill={chart.color(data.group)}
                  fillOpacity={0.95}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <text textAnchor="middle" style={{ fontSize: 10 }}>
                  {words.slice(0, 3).map((word, index, array) => (
                    <tspan
                      key={`${data.id}-${word}-${index}`}
                      x={0}
                      y={`${index - array.length / 2 + 0.35}em`}
                    >
                      {word}
                    </tspan>
                  ))}
                  <tspan x={0} y={`${words.slice(0, 3).length / 2 + 0.55}em`} fillOpacity={0.7}>
                    {quantityLabel}
                  </tspan>
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <p className="px-2 pb-2 pt-1 text-xs text-muted-foreground">
        {sizeMetric === 'quantity' ? t('chart.captionQuantity') : t('chart.captionRevenue')}
      </p>
    </div>
  )
}
