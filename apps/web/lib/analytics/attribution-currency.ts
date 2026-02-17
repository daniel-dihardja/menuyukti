export const DEFAULT_ATTRIBUTION_CURRENCY = "IDR";

export function resolveAttributionCurrencyCode(currencyCode: string | null | undefined): string {
  if (!currencyCode) return DEFAULT_ATTRIBUTION_CURRENCY;
  const normalized = currencyCode.trim().toUpperCase();
  if (!normalized) return DEFAULT_ATTRIBUTION_CURRENCY;
  return normalized;
}
