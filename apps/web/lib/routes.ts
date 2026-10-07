/**
 * Operator app shell (sidebar + inset + `AnalyticsPageShell`).
 * `MainHeader` is hidden on these paths (`AppChrome` uses `isOperatorAppShellPath`).
 * Guest digital menu `/m/*` keeps `MainHeader` (guest sign-in / account only).
 * Feature visibility (nav + route allowlist): `config/feature-flags.json`.
 * Admin-only paths: also declare in `config/admin-only-features.json` (nav + route guards).
 */
export const OPERATOR_APP_SHELL_PREFIXES = [
  '/analytics',
  '/workflow',
  '/calendar',
  '/playbooks',
  '/ig-studio',
  '/media',
  '/content',
  '/advisor',
  '/crm',
  '/print-orders',
  '/dashboard',
  '/staff',
  '/usage',
  '/inventar',
  '/services',
  '/team',
] as const

/**
 * Auth-required customer shell (`app/(customer)/`): `/home`, `/continue`, `/profile`.
 * Uses global `MainHeader` + `AccountMenu` — no operator sidebar.
 */
export const CUSTOMER_AUTH_PREFIXES = ['/home', '/continue', '/profile'] as const

/**
 * Unauthenticated location guest surfaces (digital menu; legacy wall redirect).
 * Keeps `MainHeader` brand chrome with guest sign-in (no operator product nav).
 */
export const PUBLIC_LOCATION_SURFACE_PREFIXES = ['/m', '/l'] as const

/**
 * Auth-required paths that are not operator sidebar shell and not customer shell
 * (legacy `/agent` rewrite alias; admin-only print shop catalog).
 */
export const CLERK_AUTH_EXTRA_PREFIXES = ['/agent', '/shop'] as const

/**
 * All Clerk-protected app prefixes (operator + customer + extras). Keep in sync with `proxy.ts`.
 * @deprecated Prefer `OPERATOR_APP_SHELL_PREFIXES` / `CUSTOMER_AUTH_PREFIXES` / `isClerkProtectedAppPath`.
 */
export const PROTECTED_APP_SHELL_PREFIXES = [
  ...OPERATOR_APP_SHELL_PREFIXES,
  ...CUSTOMER_AUTH_PREFIXES,
  ...CLERK_AUTH_EXTRA_PREFIXES,
] as const

function matchesPathPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Operator sidebar shell — hides marketing `MainHeader`. */
export function isOperatorAppShellPath(pathname: string | null): boolean {
  if (pathname == null) return false
  return matchesPathPrefix(pathname, OPERATOR_APP_SHELL_PREFIXES)
}

/** Guest digital menu / legacy wall — MainHeader uses guest sign-in instead of product chrome. */
export function isPublicLocationSurfacePath(pathname: string | null): boolean {
  if (pathname == null) return false
  return matchesPathPrefix(pathname, PUBLIC_LOCATION_SURFACE_PREFIXES)
}

/** Customer auth area (`/home`, `/continue`, `/profile`). */
export function isCustomerAuthPath(pathname: string | null): boolean {
  if (pathname == null) return false
  return matchesPathPrefix(pathname, CUSTOMER_AUTH_PREFIXES)
}

/** Any signed-in app path that proxy must protect (operator or customer). */
export function isClerkProtectedAppPath(pathname: string | null): boolean {
  if (pathname == null) return false
  return matchesPathPrefix(pathname, PROTECTED_APP_SHELL_PREFIXES)
}

export const routes = {
  login: '/login',
  signUp: '/sign-up',
  /** OAuth / SSO return URL (Clerk custom social sign-in). */
  ssoCallback: '/sso-callback',

  /** Public marketing / legal (not behind app shell). */
  about: '/about',
  privacy: '/privacy',
  terms: '/terms',

  analytics: {
    branches: '/analytics/locations',
    branchesCreate: '/analytics/locations/create',
    branchesDetail: (id: string | number) => `/analytics/locations/${id}`,
    branchesCogs: (id: string | number) => `/analytics/locations/${id}/cogs`,
    branchesMenu: (id: string | number) => `/analytics/locations/${id}/menu`,
    branchesPos: (id: string | number) => `/analytics/locations/${id}/pos`,
    /** Sales reports for a single location (Locations → venue → Reports). */
    branchesReports: (id: string | number) => `/analytics/locations/${id}/reports`,
    /**
     * Reports hub under Locations. Prefer `branchesReports(id)` / `salesWithLocation`
     * when a venue is known; this path redirects into a location when possible.
     */
    sales: '/analytics/locations/reports',
    salesWithLocation: (locationId: string | number) =>
      `/analytics/locations/${encodeURIComponent(String(locationId))}/reports`,
    /** @deprecated Legacy path; redirects to `sales`. */
    salesLegacy: '/analytics/sales',

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

  /** Owner-facing schedule (manual calendar entries). */
  calendar: '/calendar',
  calendarWithLocation: (locationId: string | number) =>
    `/calendar?locationId=${encodeURIComponent(String(locationId))}`,

  /** Dedicated location-task pipelines (playbook library). */
  playbooks: '/playbooks',
  playbookDetail: (slug: string) => `/playbooks/${encodeURIComponent(slug)}`,
  playbookNew: (slug: string) => `/playbooks/${encodeURIComponent(slug)}/new`,
  playbookInstance: (slug: string, id: string | number) =>
    `/playbooks/${encodeURIComponent(slug)}/${encodeURIComponent(String(id))}`,

  /** Restaurant CRM (customer registrations, programs). */
  crm: '/crm',
  crmApps: '/crm/apps',
  crmAppsDetail: (id: string | number) => `/crm/apps/${encodeURIComponent(String(id))}`,
  crmRegistrations: '/crm/registrations',
  crmRegistrationsWithApp: (appId: string | number) =>
    `/crm/registrations?appId=${encodeURIComponent(String(appId))}`,
  crmRegistrationsDetail: (id: string) => `/crm/registrations/${encodeURIComponent(id)}`,

  /** Standalone Instagram post drafts + Post Creator (admin). */
  igStudio: '/ig-studio',
  igStudioDetail: (id: string | number) => `/ig-studio/${encodeURIComponent(String(id))}`,
  igStudioPostCreator: '/ig-studio/post-creator',
  igStudioStyles: '/ig-studio/styles',
  igStudioStyleNew: '/ig-studio/styles/new',
  igStudioStyleDetail: (id: string | number) =>
    `/ig-studio/styles/${encodeURIComponent(String(id))}`,
  /**
   * Chat home (`agentThreadId`). List + thread detail under `/advisor`.
   * Do not add workflow-container features here.
   */
  agent: '/advisor',
  agentWithLocation: (locationId: string | number) =>
    `/advisor?locationId=${encodeURIComponent(String(locationId))}`,
  agentThread: (threadId: string) => `/advisor/${encodeURIComponent(threadId)}`,
  printOrders: '/print-orders',
  dashboard: '/dashboard',
  /** Marketing / QR landing — free-plan post-auth default. */
  root: '/',
  /** Free-plan customer home (customer shell; PWA guide). Pro redirects away. */
  home: '/home',
  /**
   * Post-auth landing: server resolves workspace plan and redirects to
   * the plan home (`/` free, `/analytics/locations` pro).
   */
  authContinue: '/continue',
  /** Menuyukti staff-only console (platform role `admin`). */
  staff: '/staff',
  /** Personal AI usage (LLM via AI Gateway + Leonardo generations). */
  usage: '/usage',
  /** Inventory (Inventar) placeholder. */
  inventar: '/inventar',
  inventarWithLocation: (locationId: string | number) =>
    `/inventar?locationId=${encodeURIComponent(String(locationId))}`,
  inventarCatalog: '/inventar/catalog',
  /** Cloud-style services catalog (Digital Menu, …). */
  services: '/services',
  servicesDigitalMenu: '/services/digital-menu',
  servicesDigitalMenuLocation: (locationId: string | number) =>
    `/services/digital-menu/${encodeURIComponent(String(locationId))}`,
  servicesPointSystem: '/services/point-system',
  servicesPointSystemLocation: (locationId: string | number) =>
    `/services/point-system/${encodeURIComponent(String(locationId))}`,
  /** Custom profile overview (name, email, avatar). */
  profile: '/profile',
  /** Workspace team management (invite existing users) — operator shell. */
  team: '/team',
  /** Clerk `<UserProfile />` host path (security, sessions, etc.); catch-all under `/profile/account/...`. */
  profileAccount: '/profile/account',

  shop: '/shop',
  shopProduct: (slug: string) => `/shop/${slug}`,
  shopDownload: (slug: string) => `/api/shop/download?slug=${encodeURIComponent(slug)}`,

  /** Public location surfaces (digital menu; legacy `/l/` redirects to `/m/`). */
  public: {
    locationMenu: (slug: string) => `/m/${encodeURIComponent(slug)}`,
    /** Per-table dine-in menu URL used by table QR stickers. */
    locationMenuTable: (slug: string, tableLabel: string) =>
      `/m/${encodeURIComponent(slug)}/t/${encodeURIComponent(tableLabel)}`,
    /** @deprecated Use `locationMenu`; `/l/` redirects to `/m/`. */
    locationWall: (slug: string) => `/l/${encodeURIComponent(slug)}`,
  },
}
