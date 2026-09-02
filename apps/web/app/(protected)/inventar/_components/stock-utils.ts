import { getAppCurrencyCode } from '@/lib/app-currency'
import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'

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
