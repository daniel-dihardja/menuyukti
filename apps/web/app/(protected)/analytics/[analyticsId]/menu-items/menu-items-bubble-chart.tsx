'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import * as d3 from 'd3'

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

const CHART_SIZE = 928
const CHART_MARGIN = 1

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
  const formatNumber = useMemo(() => d3.format(',d'), [])

  const chart = useMemo(() => {
    const data = buildBubbleData(rows)
    if (data.length === 0) {
      return null
    }

    const color = d3.scaleOrdinal(d3.schemeTableau10)
    const pack = d3
      .pack<BubbleHierarchyDatum>()
      .size([CHART_SIZE - CHART_MARGIN * 2, CHART_SIZE - CHART_MARGIN * 2])
      .padding(3)

    const root = pack(
      d3.hierarchy<BubbleHierarchyDatum>({ children: data }).sum((d) => {
        return 'quantity' in d ? d.quantity : 0
      }),
    )

    const leaves = root.leaves()

    return {
      leaves,
      color,
    }
  }, [rows])

  if (!chart) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {t('chart.empty')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card p-2 shadow-sm">
      <svg
        width={CHART_SIZE}
        height={CHART_SIZE}
        viewBox={`${-CHART_MARGIN} ${-CHART_MARGIN} ${CHART_SIZE} ${CHART_SIZE}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={t('chart.ariaLabel')}
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
                  fillOpacity={0.7}
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
      <p className="px-2 pb-2 pt-1 text-xs text-muted-foreground">{t('chart.caption')}</p>
    </div>
  )
}
