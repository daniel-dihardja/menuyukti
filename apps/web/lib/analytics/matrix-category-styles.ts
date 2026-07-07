import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'

export const MATRIX_CATEGORY_BADGE_CLASS: Record<MatrixCategory, string> = {
  star: 'bg-[var(--color-accent)] text-ink border-transparent',
  plow_horse: 'bg-orange text-ink border-transparent',
  puzzle: 'bg-sky/30 text-ink border-sky/50',
  low_end: 'bg-lavender/30 text-ink border-lavender/50',
}
