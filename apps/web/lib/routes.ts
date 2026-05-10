/**
 * URL prefixes for the signed-in app shell (sidebar + inset + `AnalyticsPageShell`).
 * Primary nav and account live in `AppSidebar` / inset; `MainHeader` is hidden on these paths
 * (`AppChrome` uses `isProtectedAppShellPath`). Keep in sync with `middleware.ts` protected routes.
 * Admin-only paths: also declare in `config/admin-only-features.json` (nav + route guards).
 */
export const PROTECTED_APP_SHELL_PREFIXES = [
  '/analytics',
  '/workflow',
  '/canvas',
  '/advisor',
  '/print-orders',
  '/dashboard',
  '/skills',
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
    branchesDetail: (id: string | number) => `/analytics/locations/${id}`,
    sales: '/analytics/sales',

    matrix: (analyticsId: string | number) => `/analytics/${analyticsId}/matrix`,
    attribution: (analyticsId: string | number) => `/analytics/${analyticsId}/attribution`,

    finance: (analyticsId: string | number) => `/analytics/${analyticsId}/finance`,

    heatmap: (analyticsId: string | number) => `/analytics/${analyticsId}/heatmap`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
    menuItems: (analyticsId: string | number) => `/analytics/${analyticsId}/menu-items`,
  },

  /** AI canvas (brand library + generation). */
  canvas: '/canvas',
  canvasSession: (id: string | number) => `/canvas/${id}`,
  /** Standalone assistant chat (same `/api/chat` stack as workflows). */
  agent: '/advisor',
  printOrders: '/print-orders',
  dashboard: '/dashboard',
  /** Menuyukti staff-only console (platform role `admin`). */
  staff: '/staff',
  /** Vercel AI Gateway credits and per-model usage (platform role `admin`). */
  usage: '/usage',
  /** Custom profile overview (name, email, avatar). */
  profile: '/profile',
  /** Clerk `<UserProfile />` host path (security, sessions, etc.); catch-all under `/profile/account/...`. */
  profileAccount: '/profile/account',

  workflows: {
    list: '/workflow',
    detail: (id: string | number) => `/workflow/${id}`,
  },

  skills: '/skills',

  shop: '/shop',
  shopProduct: (slug: string) => `/shop/${slug}`,
  shopDownload: (slug: string) => `/api/shop/download?slug=${encodeURIComponent(slug)}`,
}
