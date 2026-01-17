export const routes = {
  login: "/login",
  news: "/news",

  analytics: {
    branches: "/analytics/branches",
    branchesCreate: "/analytics/branches/create",
    sales: "/analytics/sales",

    // only this one is scoped by analyticsId
    cogs: (analyticsId: string) => `/analytics/${analyticsId}/cogs`,
    matrix: (analyticsId: string) => `/analytics/${analyticsId}/matrix`,
  },

  docs: "/docs",
};
