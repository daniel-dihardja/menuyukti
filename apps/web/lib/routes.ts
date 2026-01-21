export const routes = {
  login: "/login",
  news: "/news",

  analytics: {
    branches: "/analytics/branches",
    branchesCreate: "/analytics/branches/create",
    sales: "/analytics/sales",

    matrix: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/matrix`,

    finance: (analyticsId: string | number) =>
      `/analytics/${analyticsId}/finance`,

    cogs: (analyticsId: string | number) => `/analytics/${analyticsId}/cogs`,
  },

  branches: {
    list: "/branches",

    detail: (branchId: string | number) => `/branches/${branchId}`,

    fixedCosts: (branchId: string | number) =>
      `/analytics/branches/${branchId}/fixed-cost`,
  },

  docs: "/docs",
};
