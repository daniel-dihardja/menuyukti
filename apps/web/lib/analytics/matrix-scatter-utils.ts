import { normalizeCategory, type MatrixCategory } from '@/lib/analytics/matrix-page-adapter'

export function normalizeCategoryForChart(raw: string): MatrixCategory {
  return normalizeCategory(raw)
}
