export const routes = {
  login: "/login",
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

    ai: (analyticsId: string | number) => `/analytics/${analyticsId}/ai`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
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
