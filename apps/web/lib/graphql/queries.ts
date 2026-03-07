/**
 * GraphQL query and mutation strings and response types used by the web app.
 */

export const LOCATIONS_QUERY = `
  query Locations {
    locations {
      id
      name
    }
  }
`;

export type LocationsData = {
  locations: Array<{ id: string; name: string }>;
};

export const CREATE_LOCATION_MUTATION = `
  mutation CreateLocation($name: String!) {
    createLocation(name: $name) {
      id
      name
    }
  }
`;

export type CreateLocationData = {
  createLocation: { id: string; name: string };
};

export const ANALYTICS_RUNS_BY_LOCATION_QUERY = `
  query AnalyticsRunsByLocation($locationId: Int!) {
    analyticsRuns(locationId: $locationId) {
      id
      name
      filename
    }
  }
`;

export type AnalyticsRunsByLocationData = {
  analyticsRuns: Array<{ id: string; name: string; filename: string }>;
};

export const ANALYTICS_RUN_QUERY = `
  query AnalyticsRun($id: ID!) {
    analyticsRun(id: $id) {
      id
      name
      filename
      posSystem
      periodStart
      periodEnd
      createdAt
      locationId
      menuItemCogs {
        id
        analyticsRunId
        menu
        menuCategory
        menuCategoryDetail
        cogs
        currency
      }
      orderMetrics {
        avgOrderSize
        avgOrderRevenue
      }
      menuHeatmaps {
        menu
        menuCategory
        menuCategoryDetail
        dailyHeatmap { hour quantity }
        weeklyHeatmap { day quantity }
      }
      menuEngineeringMatrix {
        thresholds {
          avgPopularity
          avgContributionMargin
          totalCogs
          totalProfit
          totalMargin
        }
        distribution {
          category
          itemCount
          itemShare
          marginShare
        }
        items {
          menu
          quantity
          totalRevenue
          cogs
          totalCogs
          contributionMargin
          contributionMarginPercentage
          marginPerUnit
          weValue
          category
          action
          menuCategory
          menuCategoryDetail
        }
      }
    }
  }
`;

export type AnalyticsRunData = {
  analyticsRun: {
    id: string;
    name: string;
    filename: string;
    posSystem: string;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
    locationId: number;
    menuItemCogs: Array<{
      id: number;
      analyticsRunId: number;
      menu: string;
      menuCategory: string | null;
      menuCategoryDetail: string | null;
      cogs: number;
      currency: string | null;
    }>;
    orderMetrics: { avgOrderSize: number; avgOrderRevenue: number };
    menuHeatmaps: Array<{
      menu: string;
      menuCategory: string | null;
      menuCategoryDetail: string | null;
      dailyHeatmap: Array<{ hour: number; quantity: number }>;
      weeklyHeatmap: Array<{ day: string; quantity: number }>;
    }>;
    menuEngineeringMatrix: {
      thresholds: {
        avgPopularity: number;
        avgContributionMargin: number;
        totalCogs: number;
        totalProfit: number;
        totalMargin: number;
      };
      distribution: Array<{
        category: string;
        itemCount: number;
        itemShare: number;
        marginShare: number;
      }>;
      items: Array<{
        menu: string;
        quantity: number;
        totalRevenue: number;
        cogs: number;
        totalCogs: number;
        contributionMargin: number;
        contributionMarginPercentage: number;
        marginPerUnit: number;
        weValue: number;
        category: string;
        action: string;
        menuCategory: string | null;
        menuCategoryDetail: string | null;
      }>;
    } | null;
  } | null;
};
