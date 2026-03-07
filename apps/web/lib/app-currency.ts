import { getCurrencyLocale } from "@/lib/currency";

const DEFAULT_APP_CURRENCY = "IDR";

/**
 * App-level currency code used for all currency formatting in the UI.
 * Configurable via NEXT_PUBLIC_APP_CURRENCY (e.g. IDR, USD). Not fetched from the DB.
 */
export function getAppCurrencyCode(): string {
  const raw =
    typeof process.env.NEXT_PUBLIC_APP_CURRENCY !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_CURRENCY
      : DEFAULT_APP_CURRENCY;
  return (raw ?? DEFAULT_APP_CURRENCY).trim().toUpperCase() || DEFAULT_APP_CURRENCY;
}

/**
 * Locale for the app currency (for Intl formatting). Derived from app currency code.
 */
export function getAppCurrencyLocale(): string {
  return getCurrencyLocale(getAppCurrencyCode());
}
