/**
 * First-path-segment values that must never be used as location public_slug.
 * Keep in sync with apps/graphql/schema/mutations/public_slug.py RESERVED_PUBLIC_SLUGS.
 */
export const RESERVED_PUBLIC_SLUGS = new Set([
  'about',
  'advisor',
  'agent',
  'analytics',
  'api',
  'calendar',
  'continue',
  'content',
  'crm',
  'dashboard',
  'home',
  'ig-studio',
  'inventar',
  'l',
  'login',
  'm',
  'media',
  'playbooks',
  'print-orders',
  'privacy',
  'profile',
  'services',
  'shop',
  'sign-up',
  'sso-callback',
  'staff',
  'team',
  'terms',
  'usage',
  'workflow',
])

export function isReservedPublicSlug(slug: string): boolean {
  return RESERVED_PUBLIC_SLUGS.has(slug.trim().toLowerCase())
}
