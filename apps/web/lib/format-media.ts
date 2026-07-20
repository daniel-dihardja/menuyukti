/** Shared media grid formatting helpers (content reels/stories, etc.). */

export const MEDIA_GRID_SKELETON_COUNT = 8

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDimensions(width?: number, height?: number): string | null {
  if (!width || !height) return null
  return `${width} X ${height}`
}
