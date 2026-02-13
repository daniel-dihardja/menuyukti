export const routes = {
  login: "/login",
  news: "/news",

  analytics: {
    branches: "/analytics/locations",
    branchesCreate: "/analytics/locations/create",
    sales: "/analytics/sales",

    matrix: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/matrix`,

    finance: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/finance`,

    heatmap: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/heatmap`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
  },

  agents: {
    list: "/agents",
    detail: (agentId: string) => `/agents/${agentId}`,
  },

  branches: {
    list: "/locations",

    detail: (locationId: string | number) => `/locations/${locationId}`,

    fixedCosts: (locationId: string | number) =>
      `/analytics/locations/${locationId}/fixed-cost`,
  },

  docs: "/docs",
};
