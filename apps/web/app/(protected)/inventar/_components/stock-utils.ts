import { getAppCurrencyCode } from '@/lib/app-currency'
import type { InventoryRefillForecastItem } from '@/lib/graphql/queries/inventory-refill-forecast'
import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { INVENTORY_STORAGE_ZONE_SORT_ORDER } from '@/lib/inventar/storage-zones'
import type { SortDirection } from '@/components/sortable-table'

export type InventarBranch = { id: number; name: string; currency: string | null }

/** Slim catalog row for receive combobox (RSC → client). */
export type InventarCatalogOption = {
  id: number
  name: string
  packageSize: number
  packageUnit: string
}

export type HistoryDatePreset = '7d' | '30d' | 'all' | 'custom'

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function rangeForPreset(preset: '7d' | '30d'): { fromDate: string; toDate: string } {
  const toDate = todayIsoDate()
  const daysBack = preset === '7d' ? 6 : 29
  return { fromDate: isoDateDaysAgo(daysBack), toDate }
}

export function formatActivityDate(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function stockLineValue(row: InventoryStockRow): number | null {
  if (row.catalogItem.price == null) return null
  return row.onHand * row.catalogItem.price
}

export function totalStockValue(rows: InventoryStockRow[]): number | null {
  let total = 0
  let hasPricedRow = false
  for (const row of rows) {
    const value = stockLineValue(row)
    if (value == null) continue
    total += value
    hasPricedRow = true
  }
  return hasPricedRow ? total : null
}

export function resolveLocationCurrency(currency: string | null | undefined): string {
  const trimmed = currency?.trim()
  if (trimmed) return trimmed.toUpperCase()
  return getAppCurrencyCode()
}

export function cardActivitySummary(
  row: InventoryStockRow,
  t: (key: string, values?: Record<string, string>) => string,
  locale: string,
): string {
  const lastIn = row.lastInOn
  const lastOut = row.lastOutOn
  if (lastIn && lastOut) {
    if (lastOut >= lastIn) {
      return t('activityOut', { date: formatActivityDate(lastOut, locale) })
    }
    return t('activityIn', { date: formatActivityDate(lastIn, locale) })
  }
  if (lastOut) return t('activityOut', { date: formatActivityDate(lastOut, locale) })
  if (lastIn) return t('activityIn', { date: formatActivityDate(lastIn, locale) })
  return t('activityInEmpty')
}

export function formatAvgDailyOut(value: number | undefined, locale: string, empty: string): string {
  if (value == null || !Number.isFinite(value)) return empty
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 10 ? 2 : 1,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatDaysUntilRefill(
  value: number | null | undefined,
  locale: string,
  empty: string,
): string {
  if (value == null || !Number.isFinite(value)) return empty
  if (value <= 0) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(0)
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 10 ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(value)
}

export type InventarStockSortKey =
  | 'name'
  | 'storageZone'
  | 'pack'
  | 'onHand'
  | 'avgDailyOut'
  | 'daysUntilRefill'
  | 'value'
  | 'activity'

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection,
): number {
  const aMissing = a == null || !Number.isFinite(a)
  const bMissing = b == null || !Number.isFinite(b)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  const diff = a - b
  return direction === 'asc' ? diff : -diff
}

function latestActivityIso(row: InventoryStockRow): string | null {
  const { lastInOn, lastOutOn } = row
  if (lastInOn && lastOutOn) return lastOutOn >= lastInOn ? lastOutOn : lastInOn
  return lastOutOn ?? lastInOn
}

export function compareInventarStockRows(
  a: InventoryStockRow,
  b: InventoryStockRow,
  sortKey: InventarStockSortKey,
  sortDirection: SortDirection,
  locale: string,
  refillByCatalogId: ReadonlyMap<number, InventoryRefillForecastItem>,
): number {
  let cmp = 0

  switch (sortKey) {
    case 'name':
      cmp = a.catalogItem.name.localeCompare(b.catalogItem.name, locale)
      cmp = sortDirection === 'asc' ? cmp : -cmp
      break
    case 'storageZone': {
      const zoneDiff =
        INVENTORY_STORAGE_ZONE_SORT_ORDER[a.catalogItem.storageZone] -
        INVENTORY_STORAGE_ZONE_SORT_ORDER[b.catalogItem.storageZone]
      cmp = sortDirection === 'asc' ? zoneDiff : -zoneDiff
      break
    }
    case 'pack': {
      const sizeDiff = a.catalogItem.packageSize - b.catalogItem.packageSize
      if (sizeDiff !== 0) {
        cmp = sortDirection === 'asc' ? sizeDiff : -sizeDiff
      } else {
        const unitCmp = a.catalogItem.packageUnit.localeCompare(b.catalogItem.packageUnit, locale)
        cmp = sortDirection === 'asc' ? unitCmp : -unitCmp
      }
      break
    }
    case 'onHand':
      cmp = compareNullableNumber(a.onHand, b.onHand, sortDirection)
      break
    case 'avgDailyOut':
      cmp = compareNullableNumber(
        refillByCatalogId.get(a.catalogItemId)?.avgDailyOut,
        refillByCatalogId.get(b.catalogItemId)?.avgDailyOut,
        sortDirection,
      )
      break
    case 'daysUntilRefill':
      cmp = compareNullableNumber(
        refillByCatalogId.get(a.catalogItemId)?.daysUntilRefill,
        refillByCatalogId.get(b.catalogItemId)?.daysUntilRefill,
        sortDirection,
      )
      break
    case 'value':
      cmp = compareNullableNumber(stockLineValue(a), stockLineValue(b), sortDirection)
      break
    case 'activity': {
      const aIso = latestActivityIso(a)
      const bIso = latestActivityIso(b)
      if (!aIso && !bIso) cmp = 0
      else if (!aIso) cmp = 1
      else if (!bIso) cmp = -1
      else {
        const isoCmp = aIso.localeCompare(bIso)
        cmp = sortDirection === 'asc' ? isoCmp : -isoCmp
      }
      break
    }
    default:
      cmp = 0
  }

  if (cmp !== 0) return cmp
  return a.catalogItem.name.localeCompare(b.catalogItem.name, locale)
}

export type InventarApiErrorPayload = {
  code?: string
  message?: string
}

const INVENTAR_ERROR_CODES = [
  'LOCATION_REQUIRED',
  'CATALOG_ITEM_REQUIRED',
  'STOCK_ID_INVALID',
  'INVALID_DATE',
  'DATE_RANGE_INVALID',
  'INVALID_INPUT',
  'FORBIDDEN',
  'NOT_FOUND',
  'QUANTITY_EXCEEDED',
] as const

type InventarErrorCode = (typeof INVENTAR_ERROR_CODES)[number]

function isInventarErrorCode(code: string): code is InventarErrorCode {
  return (INVENTAR_ERROR_CODES as readonly string[]).includes(code)
}

export function inventarErrorMessage(
  payload: InventarApiErrorPayload | null,
  t: (key: string) => string,
): string {
  if (payload?.code && isInventarErrorCode(payload.code)) {
    return t(`errors.${payload.code}`)
  }
  return t('errorGeneric')
}
