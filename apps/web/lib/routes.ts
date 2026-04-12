/**
 * URL prefixes for the signed-in app shell (sidebar + header row). User profile lives in that header, not the global AppChrome bar.
 * Admin-only paths: also declare in `config/admin-only-features.json` (nav + route guards).
 */
export const PROTECTED_APP_SHELL_PREFIXES = [
  '/analytics',
  '/workflows',
  '/assets',
  '/studio',
  '/print-orders',
  '/dashboard',
  '/skills',
  '/custom-tools',
  '/staff',
  '/usage',
  '/profile',
] as const

export function isProtectedAppShellPath(pathname: string | null): boolean {
  if (pathname == null) return false
  return PROTECTED_APP_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export const routes = {
  login: '/login',
  signUp: '/sign-up',
  /** OAuth / SSO return URL (Clerk custom social sign-in). */
  ssoCallback: '/sso-callback',

  /** Public marketing / legal (not behind app shell). */
  privacy: '/privacy',
  terms: '/terms',

  analytics: {
    branches: '/analytics/locations',
    branchesCreate: '/analytics/locations/create',
    sales: '/analytics/sales',

    matrix: (analyticsId: string | number) => `/analytics/${analyticsId}/matrix`,
    attribution: (analyticsId: string | number) => `/analytics/${analyticsId}/attribution`,
    scheduler: (analyticsId: string | number) => `/analytics/${analyticsId}/scheduler`,

    finance: (analyticsId: string | number) => `/analytics/${analyticsId}/finance`,

    heatmap: (analyticsId: string | number) => `/analytics/${analyticsId}/heatmap`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
  },

  assets: '/assets',
  /** AI asset studio (brand library + generation); `/assets` redirects here. */
  studio: '/studio',
  studioSession: (id: string | number) => `/studio/${id}`,
  printOrders: '/print-orders',
  dashboard: '/dashboard',
  /** Menuyukti staff-only console (platform role `admin`). */
  staff: '/staff',
  /** Vercel AI Gateway credits and per-model usage (platform role `admin`). */
  usage: '/usage',
  /** Custom profile overview (name, email, avatar). */
  profile: '/profile',
  /** Clerk `<UserProfile />` (manage account); optional catch-all under `/profile/account/...`. */
  profileAccount: '/profile/account',

  workflows: {
    list: '/workflows',
    detail: (id: string | number) => `/workflows/${id}`,
  },

  skills: '/skills',
  customTools: '/custom-tools',

  shop: '/shop',
  shopProduct: (slug: string) => `/shop/${slug}`,
}
