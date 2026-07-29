/**
 * Format integer IDR for customer-facing UI.
 * Indonesian retail style: "Rp 0,-", "Rp 100.000,-"
 */
export function formatIdr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.trunc(amount) : 0
  const grouped = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(safe))
  const sign = safe < 0 ? '-' : ''
  return `${sign}Rp ${grouped},-`
}
