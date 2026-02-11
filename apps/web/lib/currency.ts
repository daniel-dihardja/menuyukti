const CURRENCY_LOCALES: Record<string, string> = {
  IDR: "id-ID",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  SGD: "en-SG",
  AUD: "en-AU",
  JPY: "ja-JP",
};

export function getCurrencyLocale(currency: string): string {
  return CURRENCY_LOCALES[currency] ?? "en-US";
}

export function formatCurrency(
  value: number,
  currency: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale ?? getCurrencyLocale(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}
