/** URL prefixes for the signed-in app shell (sidebar + header row). User profile lives in that header, not the global AppChrome bar. */
export const PROTECTED_APP_SHELL_PREFIXES = [
  '/analytics',
  '/workflows',
  '/assets',
  '/studio',
  '/print-orders',
  '/dashboard',
  '/skills',
  '/staff',
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
  news: '/news',

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
  /** Custom profile overview (name, email, avatar). */
  profile: '/profile',
  /** Clerk `<UserProfile />` (manage account); optional catch-all under `/profile/account/...`. */
  profileAccount: '/profile/account',

  workflows: {
    list: '/workflows',
    detail: (id: string | number) => `/workflows/${id}`,
  },

  skills: '/skills',

  agents: {
    list: '/agents',
    detail: (agentId: string) => `/agents/${agentId}`,
  },

  branches: {
    list: '/locations',

    detail: (locationId: string | number) => `/locations/${locationId}`,
  },

  docs: '/docs',

  shop: '/shop',
  shopProduct: (slug: string) => `/shop/${slug}`,
}
