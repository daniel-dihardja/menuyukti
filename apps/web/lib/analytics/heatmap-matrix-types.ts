/** Shared heatmap matrix row shape (UI + adapters; safe for non-client modules). */
export type HeatmapMatrixRow = {
  key: string
  label: string
  values: number[]
}

export type HeatmapMatrixResult = {
  rows: HeatmapMatrixRow[]
  columnLabels: string[]
}
