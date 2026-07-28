/**
 * URL prefixes for the signed-in app shell (sidebar + inset + `AnalyticsPageShell`).
 * Primary nav and account live in `AppSidebar` / inset; `MainHeader` is hidden on these paths
 * (`AppChrome` uses `isProtectedAppShellPath`). Keep in sync with `middleware.ts` protected routes.
 * Feature visibility (nav + route allowlist): `config/feature-flags.json`.
 * Admin-only paths: also declare in `config/admin-only-features.json` (nav + route guards).
 */
export const PROTECTED_APP_SHELL_PREFIXES = [
  '/analytics',
  '/workflow',
  '/calendar',
  '/ig-studio',
  '/media',
  '/content',
  '/advisor',
  '/crm',
  '/print-orders',
  '/dashboard',
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
    salesWithLocation: (locationId: string | number) =>
      `/analytics/sales?locationId=${encodeURIComponent(String(locationId))}`,

    matrix: (analyticsId: string | number) => `/analytics/${analyticsId}/matrix`,
    attribution: (analyticsId: string | number) => `/analytics/${analyticsId}/attribution`,

    finance: (analyticsId: string | number) => `/analytics/${analyticsId}/finance`,

    heatmap: (analyticsId: string | number) => `/analytics/${analyticsId}/heatmap`,
    menuCombos: (analyticsId: string | number) => `/analytics/${analyticsId}/menu-combos`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
    menuItems: (analyticsId: string | number) => `/analytics/${analyticsId}/menu-items`,
    orderMetrics: (analyticsId: string | number) => `/analytics/${analyticsId}/order-metrics`,
    campaignSignals: (analyticsId: string | number) => `/analytics/${analyticsId}/campaign-signals`,
  },

  media: '/media',

  content: {
    root: '/content',
    /** @deprecated Use `routes.media`. Kept for legacy redirects. */
    photos: '/media',
    reels: '/content/reels',
    igStories: '/content/igstories',
  },

  /** Owner-facing schedule aggregated from scheduler milestones. */
  calendar: '/calendar',
  calendarWithLocation: (locationId: string | number) =>
    `/calendar?locationId=${encodeURIComponent(String(locationId))}`,

  /** Restaurant CRM (customer registrations, programs). */
  crm: '/crm',
  crmApps: '/crm/apps',
  crmAppsDetail: (id: string | number) => `/crm/apps/${encodeURIComponent(String(id))}`,
  crmRegistrations: '/crm/registrations',
  crmRegistrationsWithApp: (appId: string | number) =>
    `/crm/registrations?appId=${encodeURIComponent(String(appId))}`,

  /** Standalone Instagram post drafts + Post Creator (admin). */
  igStudio: '/ig-studio',
  igStudioDetail: (id: string | number) => `/ig-studio/${encodeURIComponent(String(id))}`,
  igStudioPostCreator: '/ig-studio/post-creator',
  igStudioStyles: '/ig-studio/styles',
  igStudioStyleNew: '/ig-studio/styles/new',
  igStudioStyleDetail: (id: string | number) =>
    `/ig-studio/styles/${encodeURIComponent(String(id))}`,
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
  /** Workspace team management (invite existing users). */
  profileTeam: '/profile/team',
  /** Clerk `<UserProfile />` host path (security, sessions, etc.); catch-all under `/profile/account/...`. */
  profileAccount: '/profile/account',

  workflows: {
    list: '/workflow',
    listWithLocation: (locationId: string | number) =>
      `/workflow?locationId=${encodeURIComponent(String(locationId))}`,
    detail: (id: string | number) => `/workflow/${id}`,
  },

  shop: '/shop',
  shopProduct: (slug: string) => `/shop/${slug}`,
  shopDownload: (slug: string) => `/api/shop/download?slug=${encodeURIComponent(slug)}`,
}
