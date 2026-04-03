/** URL prefixes for the signed-in app shell (sidebar + header row). User profile lives in that header, not the global AppChrome bar. */
export const PROTECTED_APP_SHELL_PREFIXES = [
  "/analytics",
  "/campaigns",
  "/assets",
] as const;

export function isProtectedAppShellPath(pathname: string | null): boolean {
  if (pathname == null) return false;
  return PROTECTED_APP_SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export const routes = {
  login: "/login",
  signUp: "/sign-up",
  /** OAuth / SSO return URL (Clerk custom social sign-in). */
  ssoCallback: "/sso-callback",
  news: "/news",

  analytics: {
    branches: "/analytics/locations",
    branchesCreate: "/analytics/locations/create",
    sales: "/analytics/sales",

    matrix: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/matrix`,
    attribution: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/attribution`,
    scheduler: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/scheduler`,

    finance: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/finance`,

    heatmap: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/heatmap`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
  },

  assets: "/assets",

  campaigns: {
    list: "/campaigns",
    create: "/campaigns/create",
    createWithAnalytics: (analyticsId: string | number) =>
      `/campaigns/create?analyticsId=${analyticsId}`,
    createWithLocation: (locationId: string | number) =>
      `/campaigns/create?locationId=${locationId}`,
    detail: (id: string | number) => `/campaigns/${id}`,
  },

  agents: {
    list: "/agents",
    detail: (agentId: string) => `/agents/${agentId}`,
  },

  branches: {
    list: "/locations",

    detail: (locationId: string | number) => `/locations/${locationId}`,
  },

  docs: "/docs",

  shop: "/shop",
  shopProduct: (slug: string) => `/shop/${slug}`,
};
