export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date (isoformat) */
  Date: { input: string; output: string; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: unknown; output: unknown; }
  UUID: { input: any; output: any; }
  /** Represents a file upload. */
  Upload: { input: unknown; output: unknown; }
};

export type AdditionalSignalsType = {
  __typename?: 'AdditionalSignalsType';
  campaignPlanningSignals: CampaignPlanningSignalsType;
  datetimeSignals?: Maybe<DatetimeSignalsType>;
  matrixSignals: MatrixSignalsType;
  orderSignals?: Maybe<OrderSignalsType>;
  signalConfidence: SignalConfidenceType;
};

/** Aggregated usage for one provider+feature+model bucket. */
export type AiUsageBucketType = {
  __typename?: 'AiUsageBucketType';
  eventCount: Scalars['Int']['output'];
  feature: Scalars['String']['output'];
  inputTokens: Scalars['Int']['output'];
  model?: Maybe<Scalars['String']['output']>;
  outputTokens: Scalars['Int']['output'];
  provider: Scalars['String']['output'];
  units: Scalars['Int']['output'];
};

/** One recorded AI usage event for the authenticated user. */
export type AiUsageEventType = {
  __typename?: 'AiUsageEventType';
  createdAt: Scalars['String']['output'];
  externalId?: Maybe<Scalars['String']['output']>;
  feature: Scalars['String']['output'];
  id: Scalars['String']['output'];
  model?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  status: Scalars['String']['output'];
  units: Scalars['Int']['output'];
};

/** Personal AI usage summary for a date range. */
export type AiUsageSummaryType = {
  __typename?: 'AiUsageSummaryType';
  buckets: Array<AiUsageBucketType>;
  endDate: Scalars['String']['output'];
  recentEvents: Array<AiUsageEventType>;
  startDate: Scalars['String']['output'];
  totalUnits: Scalars['Int']['output'];
};

/** Select which analytics sections to include in the bundle. */
export type AnalyticsBundleOptionsInput = {
  includeCategoryMix?: Scalars['Boolean']['input'];
  includeMenuEngineeringMatrix?: Scalars['Boolean']['input'];
  includeMenuHeatmaps?: Scalars['Boolean']['input'];
  includeOrderMetrics?: Scalars['Boolean']['input'];
};

/** Multiple analytics computations from a single order-fact load. */
export type AnalyticsBundleType = {
  __typename?: 'AnalyticsBundleType';
  analyticsRunId: Scalars['ID']['output'];
  categoryMix?: Maybe<CategoryMixPayloadType>;
  menuEngineeringMatrix?: Maybe<MenuEngineeringMatrixType>;
  menuHeatmaps?: Maybe<Array<MenuHeatmapType>>;
  orderMetrics?: Maybe<AnalyticsRunOrderMetricsType>;
};

/** Minimal fields for listing analytics runs by location. */
export type AnalyticsRunListItemType = {
  __typename?: 'AnalyticsRunListItemType';
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Average order size and revenue for an analytics run. */
export type AnalyticsRunOrderMetricsType = {
  __typename?: 'AnalyticsRunOrderMetricsType';
  avgOrderRevenue: Scalars['Float']['output'];
  avgOrderSize: Scalars['Float']['output'];
  slotDemandProfile: Array<SlotDemandCellType>;
};

/** Metadata for a single analytics run — period, POS system, and optional per-menu COGS. Request `menuItemCogs` only when needed; it loads from the database lazily. Use menuEngineeringMatrix, menuHeatmaps, or orderMetrics queries for computed analytics. */
export type AnalyticsRunType = {
  __typename?: 'AnalyticsRunType';
  createdAt: Scalars['DateTime']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locationId: Scalars['Int']['output'];
  /** Per-menu COGS rows; queried only when this field appears in the selection set. */
  menuItemCogs: Array<MenuItemCogsType>;
  name: Scalars['String']['output'];
  periodEnd?: Maybe<Scalars['Date']['output']>;
  periodStart?: Maybe<Scalars['Date']['output']>;
  posSystem: Scalars['String']['output'];
};

export type BestPostingWindowType = {
  __typename?: 'BestPostingWindowType';
  peakDay?: Maybe<Scalars['String']['output']>;
  peakHour?: Maybe<Scalars['Int']['output']>;
  peakRevenueDay?: Maybe<Scalars['String']['output']>;
  peakRevenueMealPeriod?: Maybe<Scalars['String']['output']>;
  primaryMealPeriod?: Maybe<Scalars['String']['output']>;
};

/** A manually created calendar entry for a location. */
export type CalendarEntryType = {
  __typename?: 'CalendarEntryType';
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  locationId: Scalars['Int']['output'];
  mediaRefs: Array<CalendarMediaRefType>;
  time: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** Input for attaching a media-library file to an entry. */
export type CalendarMediaRefInput = {
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

/** Stable reference to a media-library file. */
export type CalendarMediaRefType = {
  __typename?: 'CalendarMediaRefType';
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CampaignBriefSignalCapabilitiesType = {
  __typename?: 'CampaignBriefSignalCapabilitiesType';
  enabledBlocks: Array<Scalars['String']['output']>;
  hasDatetime: Scalars['Boolean']['output'];
  hasOrderId: Scalars['Boolean']['output'];
};

export type CampaignPlanningSignalsType = {
  __typename?: 'CampaignPlanningSignalsType';
  objectiveRecommendation: Scalars['String']['output'];
  primaryCtaChannel: Scalars['String']['output'];
  recommendedDayparts: Array<Scalars['String']['output']>;
  recommendedPostingDays: Array<Scalars['String']['output']>;
};

/** Top revenue category from category mix. */
export type CategoryFocusType = {
  __typename?: 'CategoryFocusType';
  category?: Maybe<Scalars['String']['output']>;
  quantityShare: Scalars['Float']['output'];
  revenueShare: Scalars['Float']['output'];
};

/** Category mix table for an analytics run. */
export type CategoryMixPayloadType = {
  __typename?: 'CategoryMixPayloadType';
  analyticsRunId: Scalars['ID']['output'];
  rows: Array<CategoryMixRowGqlType>;
  topRevenueCategory?: Maybe<Scalars['String']['output']>;
};

/** Revenue and quantity mix for one menu category. */
export type CategoryMixRowGqlType = {
  __typename?: 'CategoryMixRowGqlType';
  category?: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  quantityShare: Scalars['Float']['output'];
  revenue: Scalars['Float']['output'];
  revenueShare: Scalars['Float']['output'];
  topItem: Scalars['String']['output'];
};

/** Recommended promo window for a combo pair. */
export type ComboPairRecommendedWindowType = {
  __typename?: 'ComboPairRecommendedWindowType';
  bestDay?: Maybe<Scalars['String']['output']>;
  bestMealPeriod?: Maybe<Scalars['String']['output']>;
  bestMealPeriodHoursLabel?: Maybe<Scalars['String']['output']>;
  bestMealPeriodLabel?: Maybe<Scalars['String']['output']>;
  coOrderIndex?: Maybe<Scalars['Float']['output']>;
  confidenceTier: Scalars['String']['output'];
  peakHour?: Maybe<Scalars['Int']['output']>;
  sampleCoOrders: Scalars['Int']['output'];
};

/** Co-order intensity for one day and meal-period slot. */
export type ComboPairTimingCellType = {
  __typename?: 'ComboPairTimingCellType';
  attachRate: Scalars['Float']['output'];
  coOrderCount: Scalars['Int']['output'];
  coOrderIndex: Scalars['Float']['output'];
  day: Scalars['String']['output'];
  mealPeriod: Scalars['String']['output'];
  mealPeriodHoursLabel: Scalars['String']['output'];
  mealPeriodLabel: Scalars['String']['output'];
};

/** Hourly co-order count for a combo pair. */
export type ComboPairTimingHourType = {
  __typename?: 'ComboPairTimingHourType';
  coOrderCount: Scalars['Int']['output'];
  hour: Scalars['Int']['output'];
};

/** Promo posture for a combo pair's peak window. */
export type ComboPromoPostureType = {
  __typename?: 'ComboPromoPostureType';
  pairCoOrderIndex?: Maybe<Scalars['Float']['output']>;
  peakDay?: Maybe<Scalars['String']['output']>;
  peakMealPeriod?: Maybe<Scalars['String']['output']>;
  promoPosture: Scalars['String']['output'];
  promoReason: Scalars['String']['output'];
  venueDemandIndex?: Maybe<Scalars['Float']['output']>;
  venueRelativeDemand?: Maybe<Scalars['String']['output']>;
};

/** Workspace-scoped CRM app: loyalty / customer-registration tenant. Public appId (UUID) is used in enrollment QR and mobile auth claims. */
export type CrmAppType = {
  __typename?: 'CrmAppType';
  appId: Scalars['UUID']['output'];
  cashbackPercent: Scalars['Int']['output'];
  cashbackThresholdAmount: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdByClerkUserId: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['Int']['output'];
};

/** Cashback ledger entry for a CRM customer. */
export type CrmCashbackEntryType = {
  __typename?: 'CrmCashbackEntryType';
  amount: Scalars['Int']['output'];
  cashbackPercent?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customerId: Scalars['UUID']['output'];
  id: Scalars['UUID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  paymentAmount?: Maybe<Scalars['Int']['output']>;
};

/** Registration status derived from enrolled devices. */
export enum CrmCustomerStatus {
  Active = 'ACTIVE',
  None = 'NONE',
  Revoked = 'REVOKED'
}

/** Customer enrolled in a CRM app. */
export type CrmCustomerType = {
  __typename?: 'CrmCustomerType';
  /** Internal CRM app id (crm_app.id). */
  appId: Scalars['Int']['output'];
  /** Sum of cashback ledger amounts in IDR (populated on crmCustomer detail). */
  cashbackBalance: Scalars['Int']['output'];
  /** Recent cashback ledger entries (populated on crmCustomer detail). */
  cashbackEntries: Array<CrmCashbackEntryType>;
  createdAt: Scalars['DateTime']['output'];
  deviceCount: Scalars['Int']['output'];
  /** Enrolled devices (populated on crmCustomer detail). */
  devices: Array<CrmDeviceType>;
  familyName?: Maybe<Scalars['String']['output']>;
  givenName?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  lastSeenAt?: Maybe<Scalars['DateTime']['output']>;
  phoneMasked: Scalars['String']['output'];
  status: CrmCustomerStatus;
};

/** Device enrolled for a CRM customer. */
export type CrmDeviceType = {
  __typename?: 'CrmDeviceType';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  lastSeenAt?: Maybe<Scalars['DateTime']['output']>;
  platform: Scalars['String']['output'];
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Staff-minted enrollment token. The raw token is returned only once; the server stores a hash. */
export type CrmEnrollmentTokenCreatedType = {
  __typename?: 'CrmEnrollmentTokenCreatedType';
  enrollUrl: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  token: Scalars['String']['output'];
};

/** Hourly demand distribution for a menu item. */
export type DailyHeatmapType = {
  __typename?: 'DailyHeatmapType';
  hour: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
};

export type DatetimeSignalsType = {
  __typename?: 'DatetimeSignalsType';
  bestPostingWindow: BestPostingWindowType;
  periodHeadline: PeriodHeadlineType;
};

export type DayOfWeekBreakdownType = {
  __typename?: 'DayOfWeekBreakdownType';
  day: Scalars['String']['output'];
  isPeakDay: Scalars['Boolean']['output'];
  isWeekend: Scalars['Boolean']['output'];
  orderCount: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
  share: Scalars['Float']['output'];
};

export type DayTypeBreakdownType = {
  __typename?: 'DayTypeBreakdownType';
  orderCount: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
  revenueShare: Scalars['Float']['output'];
  share: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

/** Result of ingesting a sales report Excel file. Line-level `normalizedRows` and `orders` are omitted unless includeLineItems is true. */
export type ExcelUploadResult = {
  __typename?: 'ExcelUploadResult';
  filename: Scalars['String']['output'];
  headerPreview: Array<Scalars['String']['output']>;
  normalizedRows: Array<NormalizedLineItem>;
  orders: Array<OrderType>;
  salesAnalytics: Scalars['JSON']['output'];
  sheetNames: Array<Scalars['String']['output']>;
  sizeBytes: Scalars['Int']['output'];
};

export type FundamentalSalesSignalsType = {
  __typename?: 'FundamentalSalesSignalsType';
  avgItemPrice: Scalars['Float']['output'];
  avgPopularityThreshold: Scalars['Float']['output'];
  totalItemsSold: Scalars['Int']['output'];
  totalRevenue: Scalars['Float']['output'];
  uniqueMenuItems: Scalars['Int']['output'];
};

export type FundamentalSignalsType = {
  __typename?: 'FundamentalSignalsType';
  categoryFocus?: Maybe<CategoryFocusType>;
  sales: FundamentalSalesSignalsType;
  trendingItems: Array<TrendingItemType>;
};

/** Tiered analytics payload for campaign_brief and growth agents. */
export type InstagramSignalsType = {
  __typename?: 'InstagramSignalsType';
  additionalSignals: AdditionalSignalsType;
  analyticsRunId: Scalars['ID']['output'];
  capabilities: CampaignBriefSignalCapabilitiesType;
  fundamentalSignals: FundamentalSignalsType;
};

/** Workspace pantry catalog item (name and package label). */
export type InventoryCatalogItemType = {
  __typename?: 'InventoryCatalogItemType';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  maxOnHand?: Maybe<Scalars['Float']['output']>;
  minOnHand?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  packageSize: Scalars['Float']['output'];
  packageUnit: Scalars['String']['output'];
  price?: Maybe<Scalars['Float']['output']>;
  storageZone: InventoryStorageZone;
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['Int']['output'];
};

/** Direction of an inventar stock movement. */
export enum InventoryStockMovementDirection {
  In = 'in',
  Out = 'out',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out'
}

/** One receive, use, or transfer leg for pantry stock. */
export type InventoryStockMovementType = {
  __typename?: 'InventoryStockMovementType';
  catalogItemId: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdByClerkUserId?: Maybe<Scalars['String']['output']>;
  direction: InventoryStockMovementDirection;
  id: Scalars['Int']['output'];
  locationId: Scalars['Int']['output'];
  note?: Maybe<Scalars['String']['output']>;
  occurredOn: Scalars['Date']['output'];
  quantity: Scalars['Float']['output'];
  relatedLocationId?: Maybe<Scalars['Int']['output']>;
  relatedMovementId?: Maybe<Scalars['Int']['output']>;
  stockId?: Maybe<Scalars['Int']['output']>;
};

/** Result of moving packages between locations. */
export type InventoryStockTransferResult = {
  __typename?: 'InventoryStockTransferResult';
  fromLocationId: Scalars['Int']['output'];
  fromStock?: Maybe<InventoryStockType>;
  toLocationId: Scalars['Int']['output'];
  toStock: InventoryStockType;
};

/** Location stock level for a pantry catalog item. */
export type InventoryStockType = {
  __typename?: 'InventoryStockType';
  catalogItem: InventoryCatalogItemType;
  catalogItemId: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  lastInOn?: Maybe<Scalars['Date']['output']>;
  lastOutOn?: Maybe<Scalars['Date']['output']>;
  lastUpdatedByClerkUserId?: Maybe<Scalars['String']['output']>;
  locationId: Scalars['Int']['output'];
  onHand: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Primary storage area for a pantry item. */
export enum InventoryStorageZone {
  Cooler = 'cooler',
  Dry = 'dry',
  Freezer = 'freezer'
}

/** Summary of analytics runs for one location. */
export type LocationAnalyticsRunSummaryType = {
  __typename?: 'LocationAnalyticsRunSummaryType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Run count and latest run for a location. */
export type LocationAnalyticsSummaryType = {
  __typename?: 'LocationAnalyticsSummaryType';
  latestRun?: Maybe<LocationAnalyticsRunSummaryType>;
  locationId: Scalars['Int']['output'];
  runCount: Scalars['Int']['output'];
};

/** Owner-provided click-first brief hints; not AI-generated. */
export type LocationManualBriefInputType = {
  __typename?: 'LocationManualBriefInputType';
  locationId: Scalars['Int']['output'];
  quickProfile: Scalars['JSON']['output'];
};

export type LocationMenuItemCogsType = {
  __typename?: 'LocationMenuItemCogsType';
  cogs: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  locationId: Scalars['Int']['output'];
  menu: Scalars['String']['output'];
  menuCategory?: Maybe<Scalars['String']['output']>;
  menuCategoryDetail?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type LocationMenuItemCogsUpsertInput = {
  cogs: Scalars['Float']['input'];
  currency?: InputMaybe<Scalars['String']['input']>;
  menuCategory?: InputMaybe<Scalars['String']['input']>;
  menuCategoryDetail?: InputMaybe<Scalars['String']['input']>;
  menuName: Scalars['String']['input'];
};

/** A restaurant location; ties POS data and product entities to a workspace or legacy owner. */
export type LocationType = {
  __typename?: 'LocationType';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  currency?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Owner-provided click-first brief hints. Not AI-generated. */
  manualBriefInput?: Maybe<LocationManualBriefInputType>;
  name: Scalars['String']['output'];
  nodeId?: Maybe<Scalars['ID']['output']>;
  openingHours: Array<OpeningHourType>;
  street?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['ID']['output']>;
};

export type MatrixSignalItemType = {
  __typename?: 'MatrixSignalItemType';
  matrixCategory: Scalars['String']['output'];
  menu: Scalars['String']['output'];
  menuCategory?: Maybe<Scalars['String']['output']>;
  menuCategoryDetail?: Maybe<Scalars['String']['output']>;
  totalRevenue: Scalars['Float']['output'];
};

export type MatrixSignalsType = {
  __typename?: 'MatrixSignalsType';
  avoidItems: Array<MatrixSignalItemType>;
  contentHeroes: Array<MatrixSignalItemType>;
};

export type MealPeriodBreakdownType = {
  __typename?: 'MealPeriodBreakdownType';
  label: Scalars['String']['output'];
  orderCount: Scalars['Int']['output'];
  period: Scalars['String']['output'];
  revenue: Scalars['Float']['output'];
  revenueShare: Scalars['Float']['output'];
  share: Scalars['Float']['output'];
};

/** Catalog entry for a workspace photo in the media library. */
export type MediaAssetType = {
  __typename?: 'MediaAssetType';
  createdByClerkUserId: Scalars['String']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  filename: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  workspaceId: Scalars['Int']['output'];
};

/** Named group of media assets within a workspace. */
export type MediaCollectionType = {
  __typename?: 'MediaCollectionType';
  createdByClerkUserId: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  memberCount: Scalars['Int']['output'];
  members: Array<MediaAssetType>;
  name: Scalars['String']['output'];
  workspaceId: Scalars['Int']['output'];
};

/** One distinct menu line from POS data with aggregated quantity and avg unit price. */
export type MenuCatalogItemType = {
  __typename?: 'MenuCatalogItemType';
  category: Scalars['String']['output'];
  categoryDetail?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  quantity: Scalars['Int']['output'];
};

export type MenuCatalogPayloadType = {
  __typename?: 'MenuCatalogPayloadType';
  analyticsRunId: Scalars['ID']['output'];
  items: Array<MenuCatalogItemType>;
};

/** Timing analytics for when a combo pair is ordered together. */
export type MenuComboPairTimingType = {
  __typename?: 'MenuComboPairTimingType';
  dayMealCells: Array<ComboPairTimingCellType>;
  hourlyCoOrders: Array<ComboPairTimingHourType>;
  menuA: Scalars['String']['output'];
  menuB: Scalars['String']['output'];
  promoPosture: ComboPromoPostureType;
  recommendedWindow: ComboPairRecommendedWindowType;
};

/** Co-occurrence metrics for a pair of menu items within the same order. */
export type MenuComboPairType = {
  __typename?: 'MenuComboPairType';
  coOrderCount: Scalars['Int']['output'];
  confidenceAToB: Scalars['Float']['output'];
  confidenceBToA: Scalars['Float']['output'];
  lift: Scalars['Float']['output'];
  matrixCategoryA?: Maybe<Scalars['String']['output']>;
  matrixCategoryB?: Maybe<Scalars['String']['output']>;
  menuA: Scalars['String']['output'];
  menuACategory?: Maybe<Scalars['String']['output']>;
  menuB: Scalars['String']['output'];
  menuBCategory?: Maybe<Scalars['String']['output']>;
  support: Scalars['Float']['output'];
};

/** Basket affinity analytics for an analytics run: which menu items appear together in orders, ranked by lift. */
export type MenuCombosPayloadType = {
  __typename?: 'MenuCombosPayloadType';
  avgDistinctItemsPerOrder: Scalars['Float']['output'];
  focusMenus: Array<Scalars['String']['output']>;
  matrixLift: Array<Array<Maybe<Scalars['Float']['output']>>>;
  multiItemOrderCount: Scalars['Int']['output'];
  pairs: Array<MenuComboPairType>;
  scope: Scalars['String']['output'];
  slotDemandProfile: Array<SlotDemandCellType>;
  topPairTiming: Array<MenuComboPairTimingType>;
  totalOrders: Scalars['Int']['output'];
};

/** Share of items and margin contribution per BCG category (star, puzzle, plow_horse, low_end). */
export type MenuEngineeringDistributionItemType = {
  __typename?: 'MenuEngineeringDistributionItemType';
  category: Scalars['String']['output'];
  itemCount: Scalars['Int']['output'];
  itemShare: Scalars['Float']['output'];
  marginShare: Scalars['Float']['output'];
};

/** A single menu item's position in the menu engineering BCG matrix, including its classification (star, puzzle, plow_horse, low_end) and recommended action. */
export type MenuEngineeringMatrixItemType = {
  __typename?: 'MenuEngineeringMatrixItemType';
  action: Scalars['String']['output'];
  category: Scalars['String']['output'];
  cogs: Scalars['Float']['output'];
  contributionMargin: Scalars['Float']['output'];
  contributionMarginPercentage: Scalars['Float']['output'];
  marginPerUnit: Scalars['Float']['output'];
  menu: Scalars['String']['output'];
  menuCategory?: Maybe<Scalars['String']['output']>;
  menuCategoryDetail?: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  totalCogs: Scalars['Float']['output'];
  totalRevenue: Scalars['Float']['output'];
  weValue: Scalars['Float']['output'];
};

/** Full menu engineering BCG matrix for an analytics run. Contains portfolio thresholds, per-category distribution, and per-item classification. */
export type MenuEngineeringMatrixType = {
  __typename?: 'MenuEngineeringMatrixType';
  distribution: Array<MenuEngineeringDistributionItemType>;
  items: Array<MenuEngineeringMatrixItemType>;
  thresholds: MenuEngineeringThresholdsType;
};

/** Portfolio-level thresholds used to classify menu items in the engineering matrix. avgPopularity and avgContributionMargin are the BCG quadrant cut-off values. */
export type MenuEngineeringThresholdsType = {
  __typename?: 'MenuEngineeringThresholdsType';
  avgContributionMargin: Scalars['Float']['output'];
  avgPopularity: Scalars['Float']['output'];
  totalCogs: Scalars['Float']['output'];
  totalMargin: Scalars['Float']['output'];
  totalProfit: Scalars['Float']['output'];
};

/** Hourly and day-of-week demand heatmaps for a single menu item. Use this to understand when a dish sells best. */
export type MenuHeatmapType = {
  __typename?: 'MenuHeatmapType';
  dailyHeatmap: Array<DailyHeatmapType>;
  menu: Scalars['String']['output'];
  menuCategory?: Maybe<Scalars['String']['output']>;
  menuCategoryDetail?: Maybe<Scalars['String']['output']>;
  reportingPeriod: Scalars['String']['output'];
  weeklyHeatmap: Array<WeeklyHeatmapType>;
};

export type MenuItemCogsType = {
  __typename?: 'MenuItemCogsType';
  analyticsRunId: Scalars['Int']['output'];
  cogs: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  menu: Scalars['String']['output'];
  menuCategory?: Maybe<Scalars['String']['output']>;
  menuCategoryDetail?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type MenuItemCogsUpsertInput = {
  cogs: Scalars['Float']['input'];
  currency?: InputMaybe<Scalars['String']['input']>;
  menuCategory?: InputMaybe<Scalars['String']['input']>;
  menuCategoryDetail?: InputMaybe<Scalars['String']['input']>;
  menuName: Scalars['String']['input'];
};

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type Mutation = {
  __typename?: 'Mutation';
  /** Add a photo (by filename) to a media collection. */
  addMediaToCollection: MediaCollectionType;
  /** Refresh an analytics run's COGS snapshot from its location catalog. */
  applyLocationCogsToAnalyticsRun: Array<MenuItemCogsType>;
  /** Award cashback from a payment total (applies app threshold/percent) or redeem a positive amount from the customer's balance. Pass exactly one of paymentAmount or redeemAmount. */
  awardCrmCashback: CrmCashbackEntryType;
  /** Use packages from stock (decreases stock and records an out movement). */
  consumeInventoryStock: InventoryStockType;
  /** Create a manual calendar entry for a location. */
  createCalendarEntry: CalendarEntryType;
  /** Create a CRM app in the caller's primary workspace. */
  createCrmApp: CrmAppType;
  /** Create a single-use enrollment token for a CRM app. Returns the raw token once; expires in 5 minutes. */
  createCrmEnrollmentToken: CrmEnrollmentTokenCreatedType;
  /** Add a pantry item to the workspace catalog. */
  createInventoryCatalogItem: InventoryCatalogItemType;
  /** Create a catalog item and initial stock at a location in one step. */
  createInventoryCatalogItemWithStock: InventoryStockType;
  createLocation: LocationType;
  /** Create a named media collection in the caller's workspace. */
  createMediaCollection: MediaCollectionType;
  createPost: PostType;
  createPostPage: PostPageType;
  /** Create a named visual style pack in the caller's workspace. */
  createStyle: StyleType;
  createWorkspace: WorkspaceType;
  deleteAnalyticsRun: Scalars['Boolean']['output'];
  /** Delete a manual calendar entry. */
  deleteCalendarEntry: CalendarEntryType;
  /** Delete a CRM app by id. */
  deleteCrmApp: Scalars['Boolean']['output'];
  /** Delete a CRM customer registration by id. Cascades enrolled devices. */
  deleteCrmCustomer: Scalars['Boolean']['output'];
  /** Delete a pantry catalog item and all location stock rows. */
  deleteInventoryCatalogItem: Scalars['Boolean']['output'];
  /** Stop tracking a catalog item at a location. */
  deleteInventoryStock: Scalars['Boolean']['output'];
  /** Delete a media asset catalog row by filename (memberships cascade). Returns true when a row was removed; false when already absent. */
  deleteMediaAsset: Scalars['Boolean']['output'];
  /** Delete a media collection by id (memberships cascade). */
  deleteMediaCollection: Scalars['Boolean']['output'];
  deletePost: Scalars['Boolean']['output'];
  deletePostPage: Scalars['Boolean']['output'];
  deletePostPageMediaVersion: PostPageType;
  /** Delete a visual style pack by id. */
  deleteStyle: Scalars['Boolean']['output'];
  /** Idempotently create or update a media asset catalog row for a workspace photo filename. */
  ensureMediaAsset: MediaAssetType;
  inviteWorkspaceMember: WorkspaceMembershipType;
  /** Receive packages at a location (increases stock and records an in movement). */
  receiveInventoryStock: InventoryStockType;
  /** Append an AI usage ledger row for the authenticated user (Leonardo generations and similar). */
  recordAiUsageEvent: AiUsageEventType;
  /** Remove a photo (by filename) from a media collection. */
  removeMediaFromCollection: MediaCollectionType;
  removeWorkspaceMember: Scalars['Boolean']['output'];
  /** Revoke a CRM device so it can no longer authenticate. Clears refresh token hash. Idempotent if already revoked. */
  revokeCrmDevice: CrmDeviceType;
  /** Promote an analytics run's COGS snapshot into the location catalog. */
  saveAnalyticsRunCogsToLocation: Array<LocationMenuItemCogsType>;
  /** Move packages of a tracked item from one location to another. */
  transferInventoryStock: InventoryStockTransferResult;
  /** Update a manual calendar entry. */
  updateCalendarEntry: CalendarEntryType;
  /** Update a CRM app by id. */
  updateCrmApp: CrmAppType;
  /** Update a pantry catalog item. */
  updateInventoryCatalogItem: InventoryCatalogItemType;
  updateLocation: LocationType;
  /** Replace owner manual brief hints for a location. Pass quickProfile {} to clear. Does not modify AI-generated location_social_settings. */
  updateLocationManualBriefInput: LocationManualBriefInputType;
  /** Rename a media collection by id. */
  updateMediaCollection: MediaCollectionType;
  updatePost: PostType;
  updatePostPage: PostPageType;
  /** Update a visual style pack in the caller's workspace. */
  updateStyle: StyleType;
  /** Upload and normalize a POS sales Excel file, persist order facts, and return metadata and sales analytics. Set includeLineItems to receive normalizedRows and orders (large payloads). Upload size is capped by MAX_SALES_REPORT_UPLOAD_BYTES (default 30 MiB). */
  uploadSalesReport: ExcelUploadResult;
  /** Set current stock for a catalog item at a location. */
  upsertInventoryStock: InventoryStockType;
  upsertLocationMenuItemCogsBulk: Array<LocationMenuItemCogsType>;
  upsertMenuItemCogsBulk: Array<MenuItemCogsType>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationAddMediaToCollectionArgs = {
  collectionId: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationApplyLocationCogsToAnalyticsRunArgs = {
  analyticsRunId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationAwardCrmCashbackArgs = {
  customerId: Scalars['UUID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  paymentAmount?: InputMaybe<Scalars['Int']['input']>;
  redeemAmount?: InputMaybe<Scalars['Int']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationConsumeInventoryStockArgs = {
  occurredOn?: InputMaybe<Scalars['Date']['input']>;
  quantity: Scalars['Float']['input'];
  stockId: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateCalendarEntryArgs = {
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['Int']['input'];
  mediaRefs?: InputMaybe<Array<CalendarMediaRefInput>>;
  time: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateCrmAppArgs = {
  title: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateCrmEnrollmentTokenArgs = {
  appId: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateInventoryCatalogItemArgs = {
  maxOnHand?: InputMaybe<Scalars['Float']['input']>;
  minOnHand?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  packageSize: Scalars['Float']['input'];
  packageUnit: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Float']['input']>;
  storageZone?: InputMaybe<InventoryStorageZone>;
  workspaceId: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateInventoryCatalogItemWithStockArgs = {
  locationId: Scalars['Int']['input'];
  maxOnHand?: InputMaybe<Scalars['Float']['input']>;
  minOnHand?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  onHand: Scalars['Float']['input'];
  packageSize: Scalars['Float']['input'];
  packageUnit: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Float']['input']>;
  storageZone?: InputMaybe<InventoryStorageZone>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateLocationArgs = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  street?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateMediaCollectionArgs = {
  name: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePostArgs = {
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePostPageArgs = {
  generationModel?: InputMaybe<Scalars['String']['input']>;
  imageFormat?: InputMaybe<Scalars['String']['input']>;
  imageQuality?: InputMaybe<Scalars['String']['input']>;
  mediaS3Key?: InputMaybe<Scalars['String']['input']>;
  postId: Scalars['ID']['input'];
  prompt?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateStyleArgs = {
  isDefault?: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  referenceImageName: Scalars['String']['input'];
  spec: Scalars['JSON']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateWorkspaceArgs = {
  name: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteAnalyticsRunArgs = {
  analyticsRunId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteCalendarEntryArgs = {
  id: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteCrmAppArgs = {
  id: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteCrmCustomerArgs = {
  id: Scalars['UUID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteInventoryCatalogItemArgs = {
  id: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteInventoryStockArgs = {
  id: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteMediaAssetArgs = {
  filename: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteMediaCollectionArgs = {
  id: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePostArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePostPageArgs = {
  pageId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePostPageMediaVersionArgs = {
  mediaS3Key: Scalars['String']['input'];
  pageId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteStyleArgs = {
  id: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationEnsureMediaAssetArgs = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  filename: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationInviteWorkspaceMemberArgs = {
  clerkUserId: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationReceiveInventoryStockArgs = {
  catalogItemId: Scalars['Int']['input'];
  locationId: Scalars['Int']['input'];
  occurredOn?: InputMaybe<Scalars['Date']['input']>;
  quantity: Scalars['Float']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRecordAiUsageEventArgs = {
  externalId?: InputMaybe<Scalars['String']['input']>;
  feature: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  provider: Scalars['String']['input'];
  status: Scalars['String']['input'];
  units?: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRemoveMediaFromCollectionArgs = {
  collectionId: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRemoveWorkspaceMemberArgs = {
  clerkUserId: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRevokeCrmDeviceArgs = {
  deviceId: Scalars['UUID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSaveAnalyticsRunCogsToLocationArgs = {
  analyticsRunId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationTransferInventoryStockArgs = {
  fromStockId: Scalars['Int']['input'];
  occurredOn?: InputMaybe<Scalars['Date']['input']>;
  quantity: Scalars['Float']['input'];
  toLocationId: Scalars['Int']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateCalendarEntryArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  mediaRefs?: InputMaybe<Array<CalendarMediaRefInput>>;
  time?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateCrmAppArgs = {
  cashbackPercent?: InputMaybe<Scalars['Int']['input']>;
  cashbackThresholdAmount?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateInventoryCatalogItemArgs = {
  id: Scalars['Int']['input'];
  maxOnHand?: InputMaybe<Scalars['Float']['input']>;
  minOnHand?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  packageSize?: InputMaybe<Scalars['Float']['input']>;
  packageUnit?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  storageZone?: InputMaybe<InventoryStorageZone>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationArgs = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  openingHours?: InputMaybe<Array<OpeningHourInput>>;
  street?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationManualBriefInputArgs = {
  locationId: Scalars['Int']['input'];
  quickProfile: Scalars['JSON']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateMediaCollectionArgs = {
  id: Scalars['Int']['input'];
  name: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdatePostArgs = {
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdatePostPageArgs = {
  generationModel?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  imageFormat?: InputMaybe<Scalars['String']['input']>;
  imageQuality?: InputMaybe<Scalars['String']['input']>;
  mediaS3Key?: InputMaybe<Scalars['String']['input']>;
  prompt?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateStyleArgs = {
  id: Scalars['Int']['input'];
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  referenceImageName?: InputMaybe<Scalars['String']['input']>;
  spec?: InputMaybe<Scalars['JSON']['input']>;
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUploadSalesReportArgs = {
  file: Scalars['Upload']['input'];
  includeLineItems?: Scalars['Boolean']['input'];
  locationId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertInventoryStockArgs = {
  catalogItemId: Scalars['Int']['input'];
  locationId: Scalars['Int']['input'];
  onHand: Scalars['Float']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertLocationMenuItemCogsBulkArgs = {
  items: Array<LocationMenuItemCogsUpsertInput>;
  locationId: Scalars['ID']['input'];
};


/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertMenuItemCogsBulkArgs = {
  analyticsRunId: Scalars['ID']['input'];
  items: Array<MenuItemCogsUpsertInput>;
};

export type NormalizedLineItem = {
  __typename?: 'NormalizedLineItem';
  billNumber: Scalars['String']['output'];
  menu: Scalars['String']['output'];
  menuCategory: Scalars['String']['output'];
  menuCategoryDetail: Scalars['String']['output'];
  orderTime: Scalars['DateTime']['output'];
  price: Scalars['Float']['output'];
  qty: Scalars['Int']['output'];
  totalAfterBillDiscount: Scalars['Float']['output'];
};

export type OpeningHourInput = {
  closeTime: Scalars['String']['input'];
  dayOfWeek: Scalars['String']['input'];
  openTime: Scalars['String']['input'];
};

/** Opening hours for one weekday. */
export type OpeningHourType = {
  __typename?: 'OpeningHourType';
  closeTime: Scalars['String']['output'];
  dayOfWeek: Scalars['String']['output'];
  openTime: Scalars['String']['output'];
};

export type OperatingProfileType = {
  __typename?: 'OperatingProfileType';
  activeDaysCount: Scalars['Int']['output'];
  activeMealPeriods: Array<Scalars['String']['output']>;
  avgDailyOrders: Scalars['Float']['output'];
  avgOrderSize: Scalars['Float']['output'];
  dayOfWeekBreakdown: Array<DayOfWeekBreakdownType>;
  dayTypeBreakdown: Array<DayTypeBreakdownType>;
  diningFocus: Scalars['String']['output'];
  mealPeriodBreakdown: Array<MealPeriodBreakdownType>;
  operatingPattern: Scalars['String']['output'];
  peakDay: Scalars['String']['output'];
  primaryMealPeriod: Scalars['String']['output'];
  totalOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Float']['output'];
  weekdayShare: Scalars['Float']['output'];
  weekendShare: Scalars['Float']['output'];
};

export type OrderItemType = {
  __typename?: 'OrderItemType';
  menu: Scalars['String']['output'];
  menuCategory: Scalars['String']['output'];
  menuCategoryDetail: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  qty: Scalars['Int']['output'];
  totalAfterBillDiscount: Scalars['Float']['output'];
};

export type OrderSignalsType = {
  __typename?: 'OrderSignalsType';
  avgOrderItems: Scalars['Float']['output'];
  avgOrderRevenue: Scalars['Float']['output'];
  maxOrderItems: Scalars['Int']['output'];
  maxOrderRevenue: Scalars['Float']['output'];
  minOrderItems: Scalars['Int']['output'];
  minOrderRevenue: Scalars['Float']['output'];
  totalOrders: Scalars['Int']['output'];
};

export type OrderType = {
  __typename?: 'OrderType';
  billNumber: Scalars['String']['output'];
  items: Array<OrderItemType>;
  orderTime: Scalars['DateTime']['output'];
};

export type PeriodHeadlineType = {
  __typename?: 'PeriodHeadlineType';
  periodEnd: Scalars['String']['output'];
  periodStart: Scalars['String']['output'];
  previousPeriodTotalRevenue: Scalars['Float']['output'];
  revenueVsPreviousPct?: Maybe<Scalars['Float']['output']>;
  totalRevenue: Scalars['Float']['output'];
};

/** A single generated image version for a post page. */
export type PostPageMediaVersionType = {
  __typename?: 'PostPageMediaVersionType';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  mediaS3Key: Scalars['String']['output'];
  prompt?: Maybe<Scalars['String']['output']>;
};

/** A single page/slide within an Instagram post. */
export type PostPageType = {
  __typename?: 'PostPageType';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  generationModel?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageFormat?: Maybe<Scalars['String']['output']>;
  imageQuality?: Maybe<Scalars['String']['output']>;
  mediaS3Key?: Maybe<Scalars['String']['output']>;
  mediaVersions: Array<PostPageMediaVersionType>;
  prompt?: Maybe<Scalars['String']['output']>;
  sortOrder: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A standalone Instagram post draft or published post. */
export type PostType = {
  __typename?: 'PostType';
  caption?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  locationId?: Maybe<Scalars['Int']['output']>;
  mediaType?: Maybe<Scalars['String']['output']>;
  pages: Array<PostPageType>;
  status: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  workspaceId?: Maybe<Scalars['ID']['output']>;
};

/** Per-menu signals for choosing promotion content: sales totals, optional menu-engineering classification when COGS exist, and optional peak demand timing. */
export type PromotionMenuItemType = {
  __typename?: 'PromotionMenuItemType';
  action?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  cogs?: Maybe<Scalars['Float']['output']>;
  contributionMargin?: Maybe<Scalars['Float']['output']>;
  contributionMarginPercentage?: Maybe<Scalars['Float']['output']>;
  marginPerUnit?: Maybe<Scalars['Float']['output']>;
  menu: Scalars['String']['output'];
  menuCategory?: Maybe<Scalars['String']['output']>;
  menuCategoryDetail?: Maybe<Scalars['String']['output']>;
  peakDay?: Maybe<Scalars['String']['output']>;
  peakHour?: Maybe<Scalars['Int']['output']>;
  quantity: Scalars['Int']['output'];
  totalCogs?: Maybe<Scalars['Float']['output']>;
  totalRevenue: Scalars['Float']['output'];
  weValue?: Maybe<Scalars['Float']['output']>;
};

/** Analytics-run scoped list of menu items with data to support promotion picks. Engineering fields are null when the menu engineering matrix cannot be computed (e.g. missing COGS) or when an item is excluded from the matrix (no unit COGS). */
export type PromotionMenuItemsPayloadType = {
  __typename?: 'PromotionMenuItemsPayloadType';
  analyticsRunId: Scalars['ID']['output'];
  items: Array<PromotionMenuItemType>;
  /** Menus evaluated before applying the promotion list cap (same as pre-cap row count). */
  itemsTotalCount: Scalars['Int']['output'];
  /** True when more menus existed than returned in items (see cap in API docs). */
  itemsTruncated: Scalars['Boolean']['output'];
  periodEnd?: Maybe<Scalars['Date']['output']>;
  periodStart?: Maybe<Scalars['Date']['output']>;
};

export type PublicHolidayType = {
  __typename?: 'PublicHolidayType';
  date: Scalars['String']['output'];
  holidayType: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isTentative: Scalars['Boolean']['output'];
  localName: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type Query = {
  __typename?: 'Query';
  /** Return multiple analytics sections for one run using a shared OrderFact load. Use options to omit sections you do not need. */
  analyticsBundle?: Maybe<AnalyticsBundleType>;
  /** Fetch metadata and COGS for a single analytics run by ID. */
  analyticsRun?: Maybe<AnalyticsRunType>;
  /** List analytics runs for a location, newest first. Use `first` to cap rows (default 100, max 300). */
  analyticsRuns: Array<AnalyticsRunListItemType>;
  /** Revenue and quantity share per menu category for an analytics run. Returns null when the run has no order lines. */
  categoryMix?: Maybe<CategoryMixPayloadType>;
  /** Fetch one CRM app by id. Null when missing or access denied. */
  crmApp?: Maybe<CrmAppType>;
  /** List CRM apps in workspaces the current user belongs to. */
  crmApps: Array<CrmAppType>;
  /** CRM customer detail with devices. Null when missing or access denied. */
  crmCustomer?: Maybe<CrmCustomerType>;
  /** List customers enrolled in a CRM app. Empty when missing or access denied. */
  crmCustomers: Array<CrmCustomerType>;
  /** Composite Instagram signals for an analytics run: content heroes, trending items, avoid list, category focus, best posting window, and period headline. Requires order facts; returns null if none. */
  instagramSignals?: Maybe<InstagramSignalsType>;
  /** Pantry catalog for a workspace. Empty when unauthenticated or not a member. */
  inventoryCatalogItems: Array<InventoryCatalogItemType>;
  /** Stock levels at a location (joined with catalog). Empty when not authorized. */
  inventoryStock: Array<InventoryStockType>;
  /** Stock movements for a catalog item at a location, newest first. When stockId is set, only movements for that stock row (current track). Optional fromDate/toDate filter occurredOn inclusively. Empty when not authorized or fromDate is after toDate. */
  inventoryStockMovements: Array<InventoryStockMovementType>;
  /** Fetch one location by id if the caller has access. */
  location?: Maybe<LocationType>;
  /** Analytics run counts and latest run per location in one query. Only returns summaries for locations the caller can access. */
  locationAnalyticsSummaries: Array<LocationAnalyticsSummaryType>;
  /** Location-scoped COGS catalog. Empty when unauthenticated or not an owner. */
  locationMenuItemCogs: Array<LocationMenuItemCogsType>;
  /** All locations the current user can access (direct owner or workspace member). */
  locations: Array<LocationType>;
  /** List media assets (photos) in the caller's workspaces. When collectionId is set, only members of that collection. */
  mediaAssets: Array<MediaAssetType>;
  /** Fetch one media collection by id, including member assets. Null when missing. */
  mediaCollection?: Maybe<MediaCollectionType>;
  /** List media collections in workspaces the current user belongs to. */
  mediaCollections: Array<MediaCollectionType>;
  /** Return basket affinity analytics for an analytics run: menu pairs ordered together, with lift and confidence metrics. Defaults to star items when menu engineering matrix is available; otherwise top items by order presence. When locationId is set, the run must belong to that location. */
  menuCombos?: Maybe<MenuCombosPayloadType>;
  /** Compute the menu engineering BCG matrix for an analytics run. Requires COGS to be set; returns None if no COGS are available. Optionally filter returned items to specific categories (star, puzzle, plow_horse, low_end) — thresholds and distribution always reflect the full dataset. When locationId is set, the run must belong to that location (otherwise returns null). */
  menuEngineeringMatrix?: Maybe<MenuEngineeringMatrixType>;
  /** Return hourly and day-of-week demand heatmaps for every menu item in an analytics run. Use this to identify peak selling times per dish. When locationId is set, the run must belong to that location (otherwise returns an empty list). */
  menuHeatmaps: Array<MenuHeatmapType>;
  /** Distinct menu items from the latest analytics run for a location: aggregated from order lines (category, avg unit price). Returns null when there is no run or no order data. */
  menuItemsCatalog?: Maybe<MenuCatalogPayloadType>;
  /** Distinct menu items from a specific analytics run: aggregated from order lines (quantity, category, avg unit price). Returns null when run is missing/unauthorized or has no order data. */
  menuItemsCatalogForRun?: Maybe<MenuCatalogPayloadType>;
  /** Aggregated AI usage for the authenticated user in [startDate, endDate] (UTC dates). */
  myAiUsageSummary?: Maybe<AiUsageSummaryType>;
  myWorkspace?: Maybe<WorkspaceType>;
  operatingProfile?: Maybe<OperatingProfileType>;
  /** Compute average order size and revenue for an analytics run. Returns None if the run has no order data. */
  orderMetrics?: Maybe<AnalyticsRunOrderMetricsType>;
  /** A single post in the caller's workspace, with pages. */
  post?: Maybe<PostType>;
  /** Posts in workspaces the current user belongs to, newest first. */
  posts: Array<PostType>;
  /** Return per-menu promotion signals for an analytics run: volume and revenue, optional BCG-style menu-engineering metrics when COGS allow, and peak hour/day from demand heatmaps. When locationId is set, the run must belong to that location (otherwise returns null). */
  promotionMenuItems?: Maybe<PromotionMenuItemsPayloadType>;
  publicHolidays: Array<PublicHolidayType>;
  /** Compare per-menu revenue for an analytics run against the previous run for the same location (or an explicit previousRunId). Returns null when the current run has no order lines. */
  revenueTrends?: Maybe<RevenueTrendsPayloadType>;
  /** Manual calendar entries for a location. Returns an empty payload when the caller is unauthenticated, does not own the location, or there are no manual entries. */
  schedulerCalendar: SchedulerCalendarPayload;
  /** Fetch one visual style pack by id. Null when missing or access denied. */
  style?: Maybe<StyleType>;
  /** List visual style packs in workspaces the current user belongs to. */
  styles: Array<StyleType>;
  workspaceMembers: Array<WorkspaceMembershipType>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryAnalyticsBundleArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
  options?: InputMaybe<AnalyticsBundleOptionsInput>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryAnalyticsRunArgs = {
  id: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryAnalyticsRunsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  locationId: Scalars['Int']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryCategoryMixArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryCrmAppArgs = {
  id: Scalars['Int']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryCrmAppsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryCrmCustomerArgs = {
  id: Scalars['UUID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryCrmCustomersArgs = {
  appId: Scalars['Int']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInstagramSignalsArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryCatalogItemsArgs = {
  workspaceId: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryStockArgs = {
  locationId: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryStockMovementsArgs = {
  catalogItemId: Scalars['ID']['input'];
  fromDate?: InputMaybe<Scalars['Date']['input']>;
  limit?: Scalars['Int']['input'];
  locationId: Scalars['ID']['input'];
  stockId?: InputMaybe<Scalars['ID']['input']>;
  toDate?: InputMaybe<Scalars['Date']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationArgs = {
  id: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationAnalyticsSummariesArgs = {
  locationIds: Array<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationMenuItemCogsArgs = {
  locationId: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMediaAssetsArgs = {
  collectionId?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMediaCollectionArgs = {
  id: Scalars['Int']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMediaCollectionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuCombosArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuEngineeringMatrixArgs = {
  analyticsRunId: Scalars['ID']['input'];
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  locationId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuHeatmapsArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuItemsCatalogArgs = {
  locationId: Scalars['Int']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuItemsCatalogForRunArgs = {
  analyticsRunId: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyAiUsageSummaryArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryOperatingProfileArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryOrderMetricsArgs = {
  analyticsRunId: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPostArgs = {
  id: Scalars['ID']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPostsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPromotionMenuItemsArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicHolidaysArgs = {
  country: Scalars['String']['input'];
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryRevenueTrendsArgs = {
  analyticsRunId: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['ID']['input']>;
  previousRunId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QuerySchedulerCalendarArgs = {
  locationId: Scalars['Int']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryStyleArgs = {
  id: Scalars['Int']['input'];
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryStylesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryWorkspaceMembersArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['ID']['input'];
};

/** Per-menu revenue comparison between two analytics periods. */
export type RevenueTrendRowGqlType = {
  __typename?: 'RevenueTrendRowGqlType';
  changePct?: Maybe<Scalars['Float']['output']>;
  currentRevenue: Scalars['Float']['output'];
  menu: Scalars['String']['output'];
  previousRevenue: Scalars['Float']['output'];
  rankCurrent: Scalars['Int']['output'];
  rankPrevious: Scalars['Int']['output'];
  trendLabel: Scalars['String']['output'];
};

/** Revenue trends for an analytics run vs a baseline period. */
export type RevenueTrendsPayloadType = {
  __typename?: 'RevenueTrendsPayloadType';
  analyticsRunId: Scalars['ID']['output'];
  currentPeriodTotalRevenue: Scalars['Float']['output'];
  previousPeriodTotalRevenue: Scalars['Float']['output'];
  rows: Array<RevenueTrendRowGqlType>;
};

/** A public holiday overlay for the calendar window. */
export type SchedulerCalendarHolidayType = {
  __typename?: 'SchedulerCalendarHolidayType';
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/** Location-scoped calendar of manual calendar entries. Public holidays are not populated by this query. */
export type SchedulerCalendarPayload = {
  __typename?: 'SchedulerCalendarPayload';
  publicHolidays: Array<SchedulerCalendarHolidayType>;
  slots: Array<SchedulerCalendarSlotType>;
  windowEnd?: Maybe<Scalars['String']['output']>;
  windowStart?: Maybe<Scalars['String']['output']>;
};

/** A scheduled content slot (feed post, Story, or Reel). */
export type SchedulerCalendarSlotType = {
  __typename?: 'SchedulerCalendarSlotType';
  date: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  mediaRefs?: Maybe<Array<CalendarMediaRefType>>;
  source?: Maybe<Scalars['String']['output']>;
  time: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type SignalConfidenceType = {
  __typename?: 'SignalConfidenceType';
  coverageNotes: Array<Scalars['String']['output']>;
  tier: Scalars['String']['output'];
};

/** Venue demand for one day and meal-period slot. */
export type SlotDemandCellType = {
  __typename?: 'SlotDemandCellType';
  day: Scalars['String']['output'];
  demandIndex: Scalars['Float']['output'];
  mealPeriod: Scalars['String']['output'];
  mealPeriodHoursLabel: Scalars['String']['output'];
  mealPeriodLabel: Scalars['String']['output'];
  orderCount: Scalars['Int']['output'];
  relativeDemand: Scalars['String']['output'];
  trafficShare: Scalars['Float']['output'];
};

/** Workspace-scoped visual style pack: Style Spec v2 JSON plus one media-library reference image used when generating Instagram posts. */
export type StyleType = {
  __typename?: 'StyleType';
  createdByClerkUserId: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  referenceImageName: Scalars['String']['output'];
  rules: Scalars['String']['output'];
  spec: Scalars['JSON']['output'];
  workspaceId: Scalars['Int']['output'];
};

/** A menu item with rising revenue vs the prior period. */
export type TrendingItemType = {
  __typename?: 'TrendingItemType';
  changePct?: Maybe<Scalars['Float']['output']>;
  currentRevenue: Scalars['Float']['output'];
  menu: Scalars['String']['output'];
  previousRevenue: Scalars['Float']['output'];
  rankCurrent: Scalars['Int']['output'];
  rankPrevious: Scalars['Int']['output'];
  trendLabel: Scalars['String']['output'];
};

/** Day-of-week demand distribution for a menu item. */
export type WeeklyHeatmapType = {
  __typename?: 'WeeklyHeatmapType';
  day: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
};

export type WorkspaceMembershipType = {
  __typename?: 'WorkspaceMembershipType';
  acceptedAt?: Maybe<Scalars['DateTime']['output']>;
  clerkUserId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  invitedAt?: Maybe<Scalars['DateTime']['output']>;
  role: Scalars['String']['output'];
  workspaceId: Scalars['ID']['output'];
};

/** A tenant workspace; locations can belong to a workspace with role-based membership. */
export type WorkspaceType = {
  __typename?: 'WorkspaceType';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  ownerClerkUserId: Scalars['String']['output'];
};
