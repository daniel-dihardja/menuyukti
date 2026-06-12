import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'

const VALID_CATEGORIES = new Set<string>(['star', 'plow_horse', 'puzzle', 'low_end'])

export function normalizeCategoryForChart(raw: string): MatrixCategory {
  const lower = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (VALID_CATEGORIES.has(lower)) return lower as MatrixCategory
  return 'low_end'
}
