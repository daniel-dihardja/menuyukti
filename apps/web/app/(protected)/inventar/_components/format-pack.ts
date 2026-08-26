export function formatPackLabel(packageSize: number, packageUnit: string): string {
  const size = Number.isInteger(packageSize)
    ? String(packageSize)
    : String(packageSize).replace(/\.?0+$/, '')
  return `${size} ${packageUnit.trim()}`
}
