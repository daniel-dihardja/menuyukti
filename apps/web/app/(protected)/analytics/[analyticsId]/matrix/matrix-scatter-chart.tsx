'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { scaleLinear } from 'd3-scale'

import { formatCurrencyWithCode } from '@/lib/currency'
import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import { normalizeCategoryForChart } from '@/lib/analytics/matrix-scatter-utils'

const CHART_WIDTH = 800
const CHART_HEIGHT = 480
const MARGIN = { top: 28, right: 28, bottom: 52, left: 72 }

const QUADRANT_FILL: Record<MatrixCategory, string> = {
  star: 'rgba(47, 212, 199, 0.08)',
  plow_horse: 'rgba(242, 183, 90, 0.08)',
  puzzle: 'rgba(135, 201, 255, 0.08)',
  low_end: 'rgba(182, 157, 255, 0.08)',
}

const POINT_FILL: Record<MatrixCategory, string> = {
  star: '#2fd4c7',
  plow_horse: '#f2b75a',
  puzzle: '#87c9ff',
  low_end: '#b69dff',
}

export type MatrixScatterItem = {
  menu: string
  quantity: number
  contributionMargin: number
  category: string
  action: string
}

type Thresholds = {
  avgPopularity: number
  avgContributionMargin: number
}

type Props = {
  items: MatrixScatterItem[]
  thresholds: Thresholds
  locale: string
  currency: string
}

export function MatrixScatterChart({ items, thresholds, locale, currency }: Props) {
  const t = useTranslations('analytics.matrix')
  const tCategories = useTranslations('analytics.matrix.categories')
  const tTable = useTranslations('analytics.matrix.table')

  const chart = useMemo(() => {
    if (items.length === 0) return null

    const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right
    const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

    const xValues = items.map((item) => item.quantity)
    const yValues = items.map((item) => item.contributionMargin)
    const xMax = Math.max(...xValues, thresholds.avgPopularity, 1) * 1.1
    const yMin = Math.min(0, ...yValues)
    const yMax = Math.max(...yValues, thresholds.avgContributionMargin, 1) * 1.1

    const xScale = scaleLinear().domain([0, xMax]).range([0, plotWidth])
    const yScale = scaleLinear().domain([yMin, yMax]).range([plotHeight, 0])

    const thresholdX = xScale(thresholds.avgPopularity)
    const thresholdY = yScale(thresholds.avgContributionMargin)

    const zones = [
      {
        category: 'puzzle' as MatrixCategory,
        x: 0,
        y: 0,
        width: thresholdX,
        height: thresholdY,
      },
      {
        category: 'star' as MatrixCategory,
        x: thresholdX,
        y: 0,
        width: plotWidth - thresholdX,
        height: thresholdY,
      },
      {
        category: 'low_end' as MatrixCategory,
        x: 0,
        y: thresholdY,
        width: thresholdX,
        height: plotHeight - thresholdY,
      },
      {
        category: 'plow_horse' as MatrixCategory,
        x: thresholdX,
        y: thresholdY,
        width: plotWidth - thresholdX,
        height: plotHeight - thresholdY,
      },
    ]

    const points = items.map((item) => {
      const category = normalizeCategoryForChart(item.category)
      return {
        ...item,
        category,
        cx: xScale(item.quantity),
        cy: yScale(item.contributionMargin),
      }
    })

    const xTicks = xScale.ticks(5)
    const yTicks = yScale.ticks(5)

    return {
      plotWidth,
      plotHeight,
      thresholdX,
      thresholdY,
      zones,
      points,
      xTicks,
      yTicks,
      xScale,
      yScale,
      xMax,
      yMin,
      yMax,
    }
  }, [items, thresholds.avgContributionMargin, thresholds.avgPopularity])

  if (!chart) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {t('chart.empty')}
      </div>
    )
  }

  const numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })

  return (
    <div className="overflow-hidden rounded-lg border bg-card p-2 shadow-sm">
      <svg
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={t('chart.ariaLabel')}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {chart.zones.map((zone) => (
            <rect
              key={zone.category}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={QUADRANT_FILL[zone.category]}
            />
          ))}

          {chart.zones.map((zone) => (
            <text
              key={`label-${zone.category}`}
              x={zone.x + 8}
              y={zone.y + 16}
              className="fill-muted-foreground text-[10px] font-medium"
            >
              {tCategories(zone.category)}
            </text>
          ))}

          <line
            x1={chart.thresholdX}
            x2={chart.thresholdX}
            y1={0}
            y2={chart.plotHeight}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeDasharray="4 4"
          />
          <line
            x1={0}
            x2={chart.plotWidth}
            y1={chart.thresholdY}
            y2={chart.thresholdY}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeDasharray="4 4"
          />

          {chart.points.map((point) => {
            const actionKey = point.action?.toLowerCase() as
              | 'keep'
              | 'promote'
              | 'reprice'
              | 'remove'
              | undefined
            const actionLabel =
              actionKey && ['keep', 'promote', 'reprice', 'remove'].includes(actionKey)
                ? tTable(`actions.${actionKey}`)
                : point.action

            return (
              <circle
                key={`${point.menu}-${point.quantity}`}
                cx={point.cx}
                cy={point.cy}
                r={5}
                fill={POINT_FILL[point.category]}
                fillOpacity={0.9}
                stroke="currentColor"
                strokeOpacity={0.15}
              >
                <title>
                  {`${point.menu}\n${t('table.qty')}: ${numberFmt.format(point.quantity)}\n${t('table.margin')}: ${formatCurrencyWithCode(point.contributionMargin, currency, locale)}\n${tCategories(point.category)}${actionLabel ? ` · ${actionLabel}` : ''}`}
                </title>
              </circle>
            )
          })}

          {chart.xTicks.map((tick) => (
            <g key={`x-${tick}`} transform={`translate(${chart.xScale(tick)},${chart.plotHeight})`}>
              <line y2={6} stroke="currentColor" strokeOpacity={0.2} />
              <text y={20} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {numberFmt.format(tick)}
              </text>
            </g>
          ))}

          {chart.yTicks.map((tick) => (
            <g key={`y-${tick}`} transform={`translate(0,${chart.yScale(tick)})`}>
              <line x2={-6} stroke="currentColor" strokeOpacity={0.2} />
              <text
                x={-10}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {formatCurrencyWithCode(tick, currency, locale)}
              </text>
            </g>
          ))}

          <line
            x1={0}
            x2={chart.plotWidth}
            y1={chart.plotHeight}
            y2={chart.plotHeight}
            stroke="currentColor"
            strokeOpacity={0.3}
          />
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={chart.plotHeight}
            stroke="currentColor"
            strokeOpacity={0.3}
          />
        </g>

        <text
          x={CHART_WIDTH / 2}
          y={CHART_HEIGHT - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          {t('chart.xAxis')}
        </text>
        <text
          transform={`translate(14, ${CHART_HEIGHT / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          {t('chart.yAxis')}
        </text>
      </svg>
    </div>
  )
}
