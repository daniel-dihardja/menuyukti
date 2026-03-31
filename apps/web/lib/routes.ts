export const routes = {
  login: "/login",
  signUp: "/sign-up",
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
};
