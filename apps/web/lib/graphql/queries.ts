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

export const LOCATION_QUERY = `
  query Location($id: ID!) {
    location(id: $id) {
      id
      name
      street
      city
      country
    }
  }
`;

export type LocationData = {
  location: {
    id: string;
    name: string;
    street: string | null;
    city: string | null;
    country: string | null;
  } | null;
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
  } | null;
};

export const MENU_ENGINEERING_MATRIX_QUERY = `
  query MenuEngineeringMatrix($id: ID!, $categories: [String!]) {
    menuEngineeringMatrix(analyticsRunId: $id, categories: $categories) {
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
`;

export type MenuEngineeringMatrixData = {
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
};

export const LOCATION_PROFILE_QUERY = `
  query LocationProfile($locationId: ID!, $analyticsRunId: ID!) {
    locationProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
      id
      summary
      updatedAt
    }
  }
`;

export type LocationProfileData = {
  locationProfile: {
    id: string;
    summary: string | null;
    updatedAt: string | null;
  } | null;
};

export const DELETE_LOCATION_PROFILE_MUTATION = `
  mutation DeleteLocationProfile($id: ID!) {
    deleteLocationProfile(id: $id)
  }
`;

export type DeleteLocationProfileData = {
  deleteLocationProfile: boolean;
};

export const DELETE_CAMPAIGN_MUTATION = `
  mutation DeleteCampaign($id: ID!) {
    deleteCampaign(id: $id)
  }
`;

export type DeleteCampaignData = {
  deleteCampaign: boolean;
};

export const CREATE_CAMPAIGN_MUTATION = `
  mutation CreateCampaign($locationId: Int!, $name: String!) {
    createCampaign(locationId: $locationId, name: $name) {
      id
      name
    }
  }
`;

export type CreateCampaignData = {
  createCampaign: { id: string; name: string };
};

export const CAMPAIGNS_BY_LOCATION_QUERY = `
  query CampaignsByLocation($locationId: Int!) {
    campaigns(locationId: $locationId) {
      id
      name
      status
      startDate
      endDate
      goal
      createdAt
    }
  }
`;

export type CampaignListItem = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  goal: string | null;
  createdAt: string | null;
};

export type CampaignsByLocationData = {
  campaigns: CampaignListItem[];
};

export const CAMPAIGN_DETAIL_QUERY = `
  query CampaignDetail($id: ID!) {
    campaign(id: $id) {
      id
      name
      status
      startDate
      endDate
      locationId
      theme
      tone
      goal
    }
  }
`;

export type CampaignDetailItem = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  locationId: number;
  theme: string | null;
  tone: string | null;
  goal: string | null;
};

export type CampaignDetailData = {
  campaign: CampaignDetailItem | null;
};

export const CAMPAIGN_BRIEF_QUERY = `
  query CampaignBriefByCampaign($campaignId: ID!) {
    campaignBrief(campaignId: $campaignId) {
      id
      campaignId
      locationId
      analyticsRunId
      campaignTheme
      tone
      targetAudience
      postingCadence
      postScheduleJson
      createdAt
      updatedAt
    }
  }
`;

export type CampaignBriefItem = {
  id: string;
  campaignId: number;
  locationId: number;
  analyticsRunId: number;
  campaignTheme: string;
  tone: string;
  targetAudience: string;
  postingCadence: string;
  postScheduleJson: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CampaignBriefData = {
  campaignBrief: CampaignBriefItem | null;
};

export const MENU_HEATMAPS_QUERY = `
  query MenuHeatmaps($id: ID!) {
    menuHeatmaps(analyticsRunId: $id) {
      menu
      menuCategory
      menuCategoryDetail
      dailyHeatmap { hour quantity }
      weeklyHeatmap { day quantity }
    }
  }
`;

export type MenuHeatmapsData = {
  menuHeatmaps: Array<{
    menu: string;
    menuCategory: string | null;
    menuCategoryDetail: string | null;
    dailyHeatmap: Array<{ hour: number; quantity: number }>;
    weeklyHeatmap: Array<{ day: string; quantity: number }>;
  }>;
};

export const PUBLIC_HOLIDAYS_QUERY = `
  query PublicHolidays($country: String!, $startDate: String!, $endDate: String!) {
    publicHolidays(country: $country, startDate: $startDate, endDate: $endDate) {
      id
      date
      name
      localName
      holidayType
      isTentative
    }
  }
`;

export type PublicHolidayItem = {
  id: string;
  date: string;
  name: string;
  localName: string;
  holidayType: string;
  isTentative: boolean;
};

export type PublicHolidaysData = {
  publicHolidays: PublicHolidayItem[];
};
