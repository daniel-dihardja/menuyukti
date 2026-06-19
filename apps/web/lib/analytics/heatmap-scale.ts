/** Relative intensity in [0, 1] for a value within min/max bounds. */
export function heatmapIntensity(value: number, min: number, max: number): number {
  const range = max - min || 1
  return (value - min) / range
}

/** Semantic chart-2 fill for heatmap cells (dark-mode safe via CSS variables). */
export function heatmapCellBackground(intensity: number): string {
  const alpha = 0.15 + intensity * 0.85
  const pct = Math.round(alpha * 100)
  return `color-mix(in oklch, var(--chart-2) ${pct}%, transparent)`
}

/** Light-to-dark fill for venue demand cells (weak → strong). intensity in [0, 1]. */
export function venueDemandCellBackground(intensity: number): string {
  const alpha = 0.12 + intensity * 0.88
  const pct = Math.round(alpha * 100)
  return `color-mix(in oklch, var(--chart-4) ${pct}%, transparent)`
}

/** Whether cell text should use high-contrast foreground. */
export function heatmapCellUsesLightText(intensity: number): boolean {
  return intensity > 0.75
}
