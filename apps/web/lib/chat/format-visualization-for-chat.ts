import { adaptLowEndPage } from '@/lib/analytics/low-end-page-adapter'
import { buildLiftMatrixRows } from '@/lib/analytics/menu-combos-page-adapter'
import type { SlotDemandCell } from '@/lib/graphql/queries/analytics'
import type { MenuHeatmapsData } from '@/lib/graphql/queries/analytics'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries/analytics'
import type { ChatVisualizationId } from '@/lib/chat/visualization-ids'

/** Max menu items included in chat summaries (raw hourly arrays are omitted). */
export const MENU_HEATMAP_CHAT_TOP_N = 25

/** When matrix data exists, chat heatmaps keep only these BCG roles (excludes low_end). */
export const HEATMAP_MATRIX_CHAT_CATEGORIES: ReadonlySet<string> = new Set([
  'star',
  'plow_horse',
  'puzzle',
])

type HeatmapMatrixChatCategory = 'star' | 'plow_horse' | 'puzzle' | 'low_end'

type MenuHeatmapItem = MenuHeatmapsData['menuHeatmaps'][number]

type MatrixChatItem = {
  menu?: string | null
  category?: string | null
}

type MenuHeatmapChatPayload = {
  menuHeatmaps: MenuHeatmapItem[]
  matrixItems?: MatrixChatItem[] | null
  dailyStartHour?: number
  dailyEndHour?: number
  analyticsRunId?: string | null
}

type SlotDemandChatPayload = {
  slotDemandProfile: SlotDemandCell[]
  analyticsRunId?: string | null
}

type PairLiftChatPayload = {
  focusMenus: string[]
  matrixLift: Array<Array<number | null>>
  totalOrders?: number
  multiItemOrderCount?: number
  scope?: string
  analyticsRunId?: string | null
}

type LowEndChatPayload = {
  items: NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items']
  distribution: NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['distribution']
  periodStart?: string | null
  periodEnd?: string | null
  analyticsRunId?: string | null
}

function formatLowEndReview(payload: LowEndChatPayload): string {
  const model = adaptLowEndPage(
    payload.items,
    payload.distribution,
    payload.periodStart ?? null,
    payload.periodEnd ?? null,
  )

  if (model.rows.length === 0) {
    return '(no Low End items)'
  }

  const lines: string[] = [
    `- **Low End items:** ${model.stats.itemCount} of ${model.stats.totalMenuItems} (${(model.stats.itemShare * 100).toFixed(1)}% of menu)`,
    `- **Margin share:** ${(model.stats.marginShare * 100).toFixed(1)}% of portfolio margin`,
    `- **Low End margin:** ${model.stats.marginAmount.toFixed(2)}`,
  ]
  if (model.stats.periodDays != null) {
    lines.push(`- **Period days:** ${model.stats.periodDays}`)
  }

  lines.push('', '### Items (weakest margin share first)')
  const sorted = [...model.rows].sort(
    (a, b) => a.contributionMarginShare - b.contributionMarginShare,
  )
  for (const row of sorted.slice(0, 25)) {
    const sharePct = (row.contributionMarginShare * 100).toFixed(2)
    const avg = row.avgQtyPerDay != null ? `, avg/day ${row.avgQtyPerDay.toFixed(2)}` : ''
    const action = row.action ?? '—'
    lines.push(
      `- **${row.menuItem}** — qty ${row.unitsSold}${avg}, margin ${row.contributionMargin.toFixed(2)} (${sharePct}%), action ${action}`,
    )
  }
  if (sorted.length > 25) {
    lines.push(`- *(Showing 25 of ${sorted.length} Low End items.)*`)
  }
  return lines.join('\n')
}

function formatSlotDemandProfile(cells: SlotDemandCell[]): string {
  if (cells.length === 0) {
    return '(no slot demand data)'
  }
  const lines = cells.map(
    (cell) =>
      `- **${cell.day} / ${cell.mealPeriodLabel}** (${cell.mealPeriodHoursLabel}): ${cell.orderCount} orders, demand index ${cell.demandIndex.toFixed(2)}, ${cell.relativeDemand} demand`,
  )
  return lines.join('\n')
}

function formatLiftValue(value: number): string {
  return value.toFixed(2)
}

function formatPairLiftMatrix(payload: PairLiftChatPayload): string {
  const { focusMenus, matrixLift, totalOrders, multiItemOrderCount, scope } = payload
  if (focusMenus.length < 2) {
    return '(not enough focus menu items for a lift matrix)'
  }

  const rows = buildLiftMatrixRows(focusMenus, matrixLift)
  const header = `| Menu | ${focusMenus.join(' | ')} |`
  const separator = `| --- | ${focusMenus.map(() => '---').join(' | ')} |`
  const body = rows.map((row, rowIndex) => {
    const values = focusMenus.map((_, colIndex) => {
      if (rowIndex === colIndex) {
        return '—'
      }
      const value = matrixLift[rowIndex]?.[colIndex]
      return value == null ? '—' : formatLiftValue(value)
    })
    return `| ${row.label} | ${values.join(' | ')} |`
  })

  const meta: string[] = []
  if (typeof totalOrders === 'number') {
    meta.push(`- **Total Orders:** ${totalOrders}`)
  }
  if (typeof multiItemOrderCount === 'number') {
    meta.push(`- **Multi Item Order Count:** ${multiItemOrderCount}`)
  }
  if (typeof scope === 'string' && scope.trim().length > 0) {
    meta.push(`- **Scope:** ${scope}`)
  }

  return [...meta, '', header, separator, ...body].join('\n')
}

function weeklyTotal(item: MenuHeatmapItem): number {
  return item.weeklyHeatmap.reduce((sum, cell) => sum + cell.quantity, 0)
}

function peakWeeklyDay(item: MenuHeatmapItem): { day: string; quantity: number } | null {
  if (item.weeklyHeatmap.length === 0) return null
  return item.weeklyHeatmap.reduce(
    (best, cell) => (cell.quantity > best.quantity ? cell : best),
    item.weeklyHeatmap[0]!,
  )
}

function peakDailyHour(item: MenuHeatmapItem): { hour: number; quantity: number } | null {
  if (item.dailyHeatmap.length === 0) return null
  return item.dailyHeatmap.reduce(
    (best, cell) => (cell.quantity > best.quantity ? cell : best),
    item.dailyHeatmap[0]!,
  )
}

function normalizeMatrixCategory(raw: string | null | undefined): HeatmapMatrixChatCategory | null {
  if (raw == null) return null
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (value === 'star' || value === 'plow_horse' || value === 'puzzle' || value === 'low_end') {
    return value
  }
  return null
}

export function buildMatrixCategoryByMenu(
  matrixItems: MatrixChatItem[] | null | undefined,
): Map<string, HeatmapMatrixChatCategory> {
  const map = new Map<string, HeatmapMatrixChatCategory>()
  if (!matrixItems || matrixItems.length === 0) return map
  for (const item of matrixItems) {
    const menu = item.menu?.trim()
    if (!menu) continue
    const category = normalizeMatrixCategory(item.category)
    if (category == null) continue
    map.set(menu, category)
  }
  return map
}

/** When matrix data exists, keep only star / plow_horse / puzzle heatmaps. */
export function filterHeatmapsForChat(
  menuHeatmaps: MenuHeatmapItem[],
  matrixItems: MatrixChatItem[] | null | undefined,
): {
  items: MenuHeatmapItem[]
  categoryByMenu: Map<string, HeatmapMatrixChatCategory>
  applied: boolean
} {
  const categoryByMenu = buildMatrixCategoryByMenu(matrixItems)
  if (categoryByMenu.size === 0) {
    return { items: menuHeatmaps, categoryByMenu, applied: false }
  }
  const allowed = new Set(
    [...categoryByMenu.entries()]
      .filter(([, category]) => HEATMAP_MATRIX_CHAT_CATEGORIES.has(category))
      .map(([menu]) => menu),
  )
  return {
    items: menuHeatmaps.filter((item) => allowed.has(item.menu?.trim() ?? '')),
    categoryByMenu,
    applied: true,
  }
}

function formatMenuHeatmapSummary(payload: MenuHeatmapChatPayload): string {
  const { items, categoryByMenu, applied } = filterHeatmapsForChat(
    payload.menuHeatmaps,
    payload.matrixItems,
  )
  if (items.length === 0) {
    return '(no menu heatmap data)'
  }

  const sorted = [...items].sort((a, b) => weeklyTotal(b) - weeklyTotal(a))
  const top = sorted.slice(0, MENU_HEATMAP_CHAT_TOP_N)
  const omitted = sorted.length - top.length

  const lines = top.map((item, index) => {
    const total = weeklyTotal(item)
    const peakDay = peakWeeklyDay(item)
    const peakHour = peakDailyHour(item)
    const category = item.menuCategory?.trim() || 'Uncategorized'
    const matrixCat = categoryByMenu.get(item.menu?.trim() ?? '')
    const roleSuffix = matrixCat != null ? `, ${matrixCat}` : ''
    const peakDayLabel = peakDay != null ? `${peakDay.day} (${peakDay.quantity} units)` : 'unknown'
    const peakHourLabel =
      peakHour != null ? `hour ${peakHour.hour} (${peakHour.quantity} units)` : 'unknown'
    return `- **${index + 1}. ${item.menu}** (${category}${roleSuffix}): weekly total ${total}, peak day ${peakDayLabel}, peak hour ${peakHourLabel}`
  })

  if (omitted > 0) {
    lines.push(
      `- *(Showing top ${MENU_HEATMAP_CHAT_TOP_N} of ${sorted.length} menu items; hourly breakdown omitted.)*`,
    )
  }

  if (applied) {
    lines.unshift('*(Filtered to star, plow horse, and puzzle menu-engineering items.)*')
  }

  if (payload.dailyStartHour != null && payload.dailyEndHour != null) {
    lines.unshift(`- **Daily hour range:** ${payload.dailyStartHour}:00–${payload.dailyEndHour}:00`)
  }

  return lines.join('\n')
}

function formatVisualizationPayload(
  visualizationId: ChatVisualizationId,
  payload: unknown,
): string {
  switch (visualizationId) {
    case 'venue_slot_strength_heatmap':
      return formatSlotDemandProfile((payload as SlotDemandChatPayload).slotDemandProfile ?? [])
    case 'pair_lift_matrix_heatmap':
      return formatPairLiftMatrix(payload as PairLiftChatPayload)
    case 'menu_item_heatmap':
      return formatMenuHeatmapSummary(payload as MenuHeatmapChatPayload)
    case 'low_end_review':
      return formatLowEndReview(payload as LowEndChatPayload)
    default: {
      const _exhaustive: never = visualizationId
      return _exhaustive
    }
  }
}

/** Same structure as preset data blocks — human-readable markdown for LLM context. */
export function formatVisualizationDataMarkdownSection(args: {
  title: string
  visualizationId: ChatVisualizationId
  payload: unknown
  usedFallbackRun?: boolean
}): string {
  const lines = [`## Visualization data — ${args.title}`]
  if (args.usedFallbackRun) {
    lines.push(
      '*(Data from a newer sales report for this location because the selected report had no data for this chart.)*',
    )
  }
  lines.push(formatVisualizationPayload(args.visualizationId, args.payload))
  return lines.join('\n')
}
