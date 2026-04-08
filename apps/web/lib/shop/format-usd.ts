const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Parses a display price string like "$185.00" or "185" to a number. */
export function parsePriceToNumber(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

export function formatUsd(amount: number): string {
  return usd.format(amount)
}
