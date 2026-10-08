import { routes } from '@/lib/routes'

/** Canonical production origin for absolute QR / share URLs (matches `app/layout.tsx` metadataBase). */
export const LANDING_SITE_URL = 'https://menuyukti.com'

export type LandingSampleMenu = {
  /** Public path, e.g. `/demo/menu`. */
  path: string
  /** Absolute URL encoded in the landing QR. */
  absoluteUrl: string
}

/**
 * Sample public menu for the marketing landing QR / mobile CTA.
 * Returns null when `NEXT_PUBLIC_LANDING_SAMPLE_MENU_SLUG` is unset so the page can omit broken links.
 */
export function getLandingSampleMenu(): LandingSampleMenu | null {
  const slug = process.env.NEXT_PUBLIC_LANDING_SAMPLE_MENU_SLUG?.trim()
  if (!slug) return null

  const path = routes.public.locationMenu(slug)
  const absoluteUrl = new URL(path, LANDING_SITE_URL).toString()
  return { path, absoluteUrl }
}
