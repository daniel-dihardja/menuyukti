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

export function formatCurrencyWithCode(
  value: number,
  currency: string,
  locale?: string,
): string {
  const resolvedLocale = locale ?? getCurrencyLocale(currency);
  const amount = new Intl.NumberFormat(resolvedLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${amount}`;
}

function getNumberSeparators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find((part) => part.type === "group")?.value ?? ",";
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  return { group, decimal };
}

export function parseCurrencyInput(
  input: string,
  currency: string,
  locale?: string,
): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const resolvedLocale = locale ?? getCurrencyLocale(currency);
  const { group, decimal } = getNumberSeparators(resolvedLocale);

  const normalized = trimmed
    .replaceAll(group, "")
    .replaceAll(decimal, ".")
    .replace(/[^0-9.-]/g, "");

  if (!normalized || normalized === "-" || normalized === ".") return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatCurrencyInput(
  value: number,
  currency: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale ?? getCurrencyLocale(currency), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
