import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'

export const MATRIX_CATEGORY_BADGE_CLASS: Record<MatrixCategory, string> = {
  star: 'bg-emerald-600 text-white border-transparent',
  plow_horse: 'bg-amber-500 text-black border-transparent',
  puzzle: 'bg-sky-100 text-sky-800 border-sky-300',
  low_end: 'bg-rose-100 text-rose-700 border-rose-300',
}
