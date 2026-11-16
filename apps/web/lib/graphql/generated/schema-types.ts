export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never
}
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  /** Date (isoformat) */
  Date: { input: string; output: string }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: unknown; output: unknown }
  /** Represents a file upload. */
  Upload: { input: unknown; output: unknown }
}

export type AdditionalSignalsType = {
  __typename?: 'AdditionalSignalsType'
  campaignPlanningSignals: CampaignPlanningSignalsType
  datetimeSignals?: Maybe<DatetimeSignalsType>
  matrixSignals: MatrixSignalsType
  orderSignals?: Maybe<OrderSignalsType>
  signalConfidence: SignalConfidenceType
}

/** Aggregated usage for one provider+feature+model bucket. */
export type AiUsageBucketType = {
  __typename?: 'AiUsageBucketType'
  eventCount: Scalars['Int']['output']
  feature: Scalars['String']['output']
  inputTokens: Scalars['Int']['output']
  model?: Maybe<Scalars['String']['output']>
  outputTokens: Scalars['Int']['output']
  provider: Scalars['String']['output']
  units: Scalars['Int']['output']
}

/** One recorded AI usage event for the authenticated user. */
export type AiUsageEventType = {
  __typename?: 'AiUsageEventType'
  createdAt: Scalars['String']['output']
  externalId?: Maybe<Scalars['String']['output']>
  feature: Scalars['String']['output']
  id: Scalars['String']['output']
  model?: Maybe<Scalars['String']['output']>
  provider: Scalars['String']['output']
  status: Scalars['String']['output']
  units: Scalars['Int']['output']
}

/** Personal AI usage summary for a date range. */
export type AiUsageSummaryType = {
  __typename?: 'AiUsageSummaryType'
  buckets: Array<AiUsageBucketType>
  endDate: Scalars['String']['output']
  recentEvents: Array<AiUsageEventType>
  startDate: Scalars['String']['output']
  totalUnits: Scalars['Int']['output']
}

/** Select which analytics sections to include in the bundle. */
export type AnalyticsBundleOptionsInput = {
  includeCategoryMix?: Scalars['Boolean']['input']
  includeMenuEngineeringMatrix?: Scalars['Boolean']['input']
  includeMenuHeatmaps?: Scalars['Boolean']['input']
  includeOrderMetrics?: Scalars['Boolean']['input']
}

/** Multiple analytics computations from a single order-fact load. */
export type AnalyticsBundleType = {
  __typename?: 'AnalyticsBundleType'
  analyticsRunId: Scalars['ID']['output']
  categoryMix?: Maybe<CategoryMixPayloadType>
  menuEngineeringMatrix?: Maybe<MenuEngineeringMatrixType>
  menuHeatmaps?: Maybe<Array<MenuHeatmapType>>
  orderMetrics?: Maybe<AnalyticsRunOrderMetricsType>
}

/** Minimal fields for listing analytics runs by location. */
export type AnalyticsRunListItemType = {
  __typename?: 'AnalyticsRunListItemType'
  filename: Scalars['String']['output']
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
}

/** Average order size and revenue for an analytics run. */
export type AnalyticsRunOrderMetricsType = {
  __typename?: 'AnalyticsRunOrderMetricsType'
  avgOrderRevenue: Scalars['Float']['output']
  avgOrderSize: Scalars['Float']['output']
  slotDemandProfile: Array<SlotDemandCellType>
}

/** Metadata for a single analytics run — period, POS system, and optional per-menu COGS. Request `menuItemCogs` only when needed; it loads from the database lazily. Use menuEngineeringMatrix, menuHeatmaps, or orderMetrics queries for computed analytics. */
export type AnalyticsRunType = {
  __typename?: 'AnalyticsRunType'
  createdAt: Scalars['DateTime']['output']
  filename: Scalars['String']['output']
  id: Scalars['ID']['output']
  locationId: Scalars['Int']['output']
  /** Per-menu COGS rows; queried only when this field appears in the selection set. */
  menuItemCogs: Array<MenuItemCogsType>
  name: Scalars['String']['output']
  periodEnd?: Maybe<Scalars['Date']['output']>
  periodStart?: Maybe<Scalars['Date']['output']>
  posSystem: Scalars['String']['output']
}

export type BestPostingWindowType = {
  __typename?: 'BestPostingWindowType'
  peakDay?: Maybe<Scalars['String']['output']>
  peakHour?: Maybe<Scalars['Int']['output']>
  peakRevenueDay?: Maybe<Scalars['String']['output']>
  peakRevenueMealPeriod?: Maybe<Scalars['String']['output']>
  primaryMealPeriod?: Maybe<Scalars['String']['output']>
}

/** A manually created calendar entry for a location. */
export type CalendarEntryType = {
  __typename?: 'CalendarEntryType'
  date: Scalars['String']['output']
  description: Scalars['String']['output']
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  mediaRefs: Array<CalendarMediaRefType>
  time: Scalars['String']['output']
  title: Scalars['String']['output']
}

/** Input for attaching a media-library file to an entry. */
export type CalendarMediaRefInput = {
  kind: Scalars['String']['input']
  name: Scalars['String']['input']
}

/** Stable reference to a media-library file. */
export type CalendarMediaRefType = {
  __typename?: 'CalendarMediaRefType'
  kind: Scalars['String']['output']
  name: Scalars['String']['output']
}

export type CampaignBriefSignalCapabilitiesType = {
  __typename?: 'CampaignBriefSignalCapabilitiesType'
  enabledBlocks: Array<Scalars['String']['output']>
  hasDatetime: Scalars['Boolean']['output']
  hasOrderId: Scalars['Boolean']['output']
}

export type CampaignPlanningSignalsType = {
  __typename?: 'CampaignPlanningSignalsType'
  objectiveRecommendation: Scalars['String']['output']
  primaryCtaChannel: Scalars['String']['output']
  recommendedDayparts: Array<Scalars['String']['output']>
  recommendedPostingDays: Array<Scalars['String']['output']>
}

/** Top revenue category from category mix. */
export type CategoryFocusType = {
  __typename?: 'CategoryFocusType'
  category?: Maybe<Scalars['String']['output']>
  quantityShare: Scalars['Float']['output']
  revenueShare: Scalars['Float']['output']
}

/** Category mix table for an analytics run. */
export type CategoryMixPayloadType = {
  __typename?: 'CategoryMixPayloadType'
  analyticsRunId: Scalars['ID']['output']
  rows: Array<CategoryMixRowGqlType>
  topRevenueCategory?: Maybe<Scalars['String']['output']>
}

/** Revenue and quantity mix for one menu category. */
export type CategoryMixRowGqlType = {
  __typename?: 'CategoryMixRowGqlType'
  category?: Maybe<Scalars['String']['output']>
  quantity: Scalars['Int']['output']
  quantityShare: Scalars['Float']['output']
  revenue: Scalars['Float']['output']
  revenueShare: Scalars['Float']['output']
  topItem: Scalars['String']['output']
}

export type ClearServiceDataResultType = {
  __typename?: 'ClearServiceDataResultType'
  clerkUserId: Scalars['String']['output']
  earnRulesDeleted: Scalars['Int']['output']
  ledgerEntriesDeleted: Scalars['Int']['output']
  locationIds: Array<Scalars['ID']['output']>
  menuCategoriesCleared: Scalars['Int']['output']
  notes: Array<Scalars['String']['output']>
  pickupOffersDeleted: Scalars['Int']['output']
  posOrdersDeleted: Scalars['Int']['output']
  predictionsDeleted: Scalars['Int']['output']
  serviceKey: Scalars['String']['output']
  subscriptionsCanceled: Scalars['Int']['output']
  votingsDeleted: Scalars['Int']['output']
  workspaceId: Scalars['ID']['output']
}

/** Recommended promo window for a combo pair. */
export type ComboPairRecommendedWindowType = {
  __typename?: 'ComboPairRecommendedWindowType'
  bestDay?: Maybe<Scalars['String']['output']>
  bestMealPeriod?: Maybe<Scalars['String']['output']>
  bestMealPeriodHoursLabel?: Maybe<Scalars['String']['output']>
  bestMealPeriodLabel?: Maybe<Scalars['String']['output']>
  coOrderIndex?: Maybe<Scalars['Float']['output']>
  confidenceTier: Scalars['String']['output']
  peakHour?: Maybe<Scalars['Int']['output']>
  sampleCoOrders: Scalars['Int']['output']
}

/** Co-order intensity for one day and meal-period slot. */
export type ComboPairTimingCellType = {
  __typename?: 'ComboPairTimingCellType'
  attachRate: Scalars['Float']['output']
  coOrderCount: Scalars['Int']['output']
  coOrderIndex: Scalars['Float']['output']
  day: Scalars['String']['output']
  mealPeriod: Scalars['String']['output']
  mealPeriodHoursLabel: Scalars['String']['output']
  mealPeriodLabel: Scalars['String']['output']
}

/** Hourly co-order count for a combo pair. */
export type ComboPairTimingHourType = {
  __typename?: 'ComboPairTimingHourType'
  coOrderCount: Scalars['Int']['output']
  hour: Scalars['Int']['output']
}

/** Promo posture for a combo pair's peak window. */
export type ComboPromoPostureType = {
  __typename?: 'ComboPromoPostureType'
  pairCoOrderIndex?: Maybe<Scalars['Float']['output']>
  peakDay?: Maybe<Scalars['String']['output']>
  peakMealPeriod?: Maybe<Scalars['String']['output']>
  promoPosture: Scalars['String']['output']
  promoReason: Scalars['String']['output']
  venueDemandIndex?: Maybe<Scalars['Float']['output']>
  venueRelativeDemand?: Maybe<Scalars['String']['output']>
}

/** Create a pickup offer for a location. */
export type CreatePickupOfferInput = {
  availableFrom: Scalars['DateTime']['input']
  availableUntil: Scalars['DateTime']['input']
  description: Scalars['String']['input']
  locationId: Scalars['Int']['input']
  price?: InputMaybe<Scalars['Float']['input']>
  title: Scalars['String']['input']
}

/** Create a prediction for a location. */
export type CreatePredictionInput = {
  closesAt: Scalars['DateTime']['input']
  locationId: Scalars['Int']['input']
  outcomes: Array<Scalars['String']['input']>
  pointsForCorrect?: Scalars['Int']['input']
  pointsForVote?: Scalars['Int']['input']
  question: Scalars['String']['input']
  rewardMode?: Scalars['String']['input']
}

/** Create a voting for a location. */
export type CreateVotingInput = {
  locationId: Scalars['Int']['input']
  options: Array<Scalars['String']['input']>
  pointsForVote?: Scalars['Int']['input']
  question: Scalars['String']['input']
  rewardMode?: Scalars['String']['input']
}

/** Hourly demand distribution for a menu item. */
export type DailyHeatmapType = {
  __typename?: 'DailyHeatmapType'
  hour: Scalars['Int']['output']
  quantity: Scalars['Int']['output']
}

export type DatetimeSignalsType = {
  __typename?: 'DatetimeSignalsType'
  bestPostingWindow: BestPostingWindowType
  periodHeadline: PeriodHeadlineType
}

export type DayOfWeekBreakdownType = {
  __typename?: 'DayOfWeekBreakdownType'
  day: Scalars['String']['output']
  isPeakDay: Scalars['Boolean']['output']
  isWeekend: Scalars['Boolean']['output']
  orderCount: Scalars['Int']['output']
  revenue: Scalars['Float']['output']
  share: Scalars['Float']['output']
}

export type DayTypeBreakdownType = {
  __typename?: 'DayTypeBreakdownType'
  orderCount: Scalars['Int']['output']
  revenue: Scalars['Float']['output']
  revenueShare: Scalars['Float']['output']
  share: Scalars['Float']['output']
  type: Scalars['String']['output']
}

/** Result of deleting the guest Food Profile. */
export type DeleteFoodProfileResultType = {
  __typename?: 'DeleteFoodProfileResultType'
  deleted: Scalars['Boolean']['output']
}

export type DevDataSeedResultType = {
  __typename?: 'DevDataSeedResultType'
  analyticsClearedPosOrders?: Maybe<Scalars['Int']['output']>
  analyticsDeletedSeedRuns?: Maybe<Scalars['Int']['output']>
  analyticsLocationCogs?: Maybe<Scalars['Int']['output']>
  analyticsLocationId?: Maybe<Scalars['ID']['output']>
  analyticsLocationName?: Maybe<Scalars['String']['output']>
  analyticsMenuCategories?: Maybe<Scalars['Int']['output']>
  analyticsMenuItems?: Maybe<Scalars['Int']['output']>
  analyticsOrderRows?: Maybe<Scalars['Int']['output']>
  analyticsPosSystem?: Maybe<Scalars['String']['output']>
  analyticsRunId?: Maybe<Scalars['ID']['output']>
  clerkUserId: Scalars['String']['output']
  createdPrimary: Scalars['Boolean']['output']
  inventarCatalogItems?: Maybe<Scalars['Int']['output']>
  inventarCleared: Scalars['Boolean']['output']
  inventarClearedPosOrders?: Maybe<Scalars['Int']['output']>
  inventarLocationId?: Maybe<Scalars['ID']['output']>
  inventarLocationName?: Maybe<Scalars['String']['output']>
  inventarMenuCategories?: Maybe<Scalars['Int']['output']>
  inventarMenuItems?: Maybe<Scalars['Int']['output']>
  inventarMovements?: Maybe<Scalars['Int']['output']>
  inventarStockRows?: Maybe<Scalars['Int']['output']>
  midoClearedPosOrders?: Maybe<Scalars['Int']['output']>
  midoLocationId?: Maybe<Scalars['ID']['output']>
  midoLocationName?: Maybe<Scalars['String']['output']>
  midoMenuCategories?: Maybe<Scalars['Int']['output']>
  midoMenuItems?: Maybe<Scalars['Int']['output']>
  notes: Array<Scalars['String']['output']>
  scope: Scalars['String']['output']
  workspaceId: Scalars['ID']['output']
}

/** Result of ingesting a sales report Excel file. Line-level `normalizedRows` and `orders` are omitted unless includeLineItems is true. */
export type ExcelUploadResult = {
  __typename?: 'ExcelUploadResult'
  filename: Scalars['String']['output']
  headerPreview: Array<Scalars['String']['output']>
  normalizedRows: Array<NormalizedLineItem>
  orders: Array<OrderType>
  salesAnalytics: Scalars['JSON']['output']
  sheetNames: Array<Scalars['String']['output']>
  sizeBytes: Scalars['Int']['output']
}

/** Active consent summary for the guest Food Profile. */
export type FoodPreferenceConsentType = {
  __typename?: 'FoodPreferenceConsentType'
  allowedSignalCategories: Array<Scalars['String']['output']>
  consentVersion: Scalars['String']['output']
  grantedAt: Scalars['DateTime']['output']
  id: Scalars['String']['output']
  privacyNoticeVersion: Scalars['String']['output']
  purpose: Scalars['String']['output']
  withdrawnAt?: Maybe<Scalars['DateTime']['output']>
}

/** One Food Profile preference (guest-self). */
export type FoodPreferenceType = {
  __typename?: 'FoodPreferenceType'
  confidence: Scalars['Float']['output']
  consentId: Scalars['String']['output']
  expiresAt?: Maybe<Scalars['DateTime']['output']>
  explanation?: Maybe<Scalars['String']['output']>
  id: Scalars['String']['output']
  originKind: Scalars['String']['output']
  originLocationId?: Maybe<Scalars['Int']['output']>
  originLocationName?: Maybe<Scalars['String']['output']>
  portabilityEnabled: Scalars['Boolean']['output']
  preferenceType: Scalars['String']['output']
  preferenceValue: Scalars['String']['output']
  recordedAt: Scalars['DateTime']['output']
  removedAt?: Maybe<Scalars['DateTime']['output']>
  sourceRef: Scalars['String']['output']
  sourceType: Scalars['String']['output']
  updatedAt: Scalars['DateTime']['output']
}

/** DSAR-style Food Profile export payload. */
export type FoodProfileExportType = {
  __typename?: 'FoodProfileExportType'
  payloadJson: Scalars['String']['output']
}

export type FundamentalSalesSignalsType = {
  __typename?: 'FundamentalSalesSignalsType'
  avgItemPrice: Scalars['Float']['output']
  avgPopularityThreshold: Scalars['Float']['output']
  totalItemsSold: Scalars['Int']['output']
  totalRevenue: Scalars['Float']['output']
  uniqueMenuItems: Scalars['Int']['output']
}

export type FundamentalSignalsType = {
  __typename?: 'FundamentalSignalsType'
  categoryFocus?: Maybe<CategoryFocusType>
  sales: FundamentalSalesSignalsType
  trendingItems: Array<TrendingItemType>
}

export type ImportPosSalesReportResult = {
  __typename?: 'ImportPosSalesReportResult'
  analyticsRunId: Scalars['ID']['output']
  lineCount: Scalars['Int']['output']
  name: Scalars['String']['output']
  orderCount: Scalars['Int']['output']
}

/** Tiered analytics payload for campaign_brief and growth agents. */
export type InstagramSignalsType = {
  __typename?: 'InstagramSignalsType'
  additionalSignals: AdditionalSignalsType
  analyticsRunId: Scalars['ID']['output']
  capabilities: CampaignBriefSignalCapabilitiesType
  fundamentalSignals: FundamentalSignalsType
}

/** Workspace pantry catalog item (name and package label). */
export type InventoryCatalogItemType = {
  __typename?: 'InventoryCatalogItemType'
  category: InventoryCategory
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  name: Scalars['String']['output']
  packageSize: Scalars['Float']['output']
  packageUnit: Scalars['String']['output']
  price?: Maybe<Scalars['Float']['output']>
  storageZone: InventoryStorageZone
  updatedAt: Scalars['DateTime']['output']
  workspaceId: Scalars['Int']['output']
}

/** Product category for a pantry item. */
export enum InventoryCategory {
  Beverages = 'beverages',
  Cleaning = 'cleaning',
  Dairy = 'dairy',
  DryGoods = 'dry_goods',
  Frozen = 'frozen',
  Other = 'other',
  Packaging = 'packaging',
  Produce = 'produce',
  Proteins = 'proteins',
  SpicesCondiments = 'spices_condiments',
}

/** Confidence of a refill forecast row. */
export enum InventoryRefillForecastConfidence {
  InsufficientHistory = 'insufficient_history',
  Ok = 'ok',
}

/** One catalog item ranked by estimated days until refill. */
export type InventoryRefillForecastItem = {
  __typename?: 'InventoryRefillForecastItem'
  avgDailyOut: Scalars['Float']['output']
  catalogItemId: Scalars['Int']['output']
  confidence: InventoryRefillForecastConfidence
  daysUntilRefill?: Maybe<Scalars['Float']['output']>
  minOnHand?: Maybe<Scalars['Float']['output']>
  name: Scalars['String']['output']
  onHand: Scalars['Float']['output']
  priorityRank: Scalars['Int']['output']
  storageZone: InventoryStorageZone
  windowDays: Scalars['Int']['output']
}

/** Direction of an inventar stock movement. */
export enum InventoryStockMovementDirection {
  In = 'in',
  Out = 'out',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
}

/** One receive, use, or transfer leg for pantry stock. */
export type InventoryStockMovementType = {
  __typename?: 'InventoryStockMovementType'
  areaId?: Maybe<Scalars['Int']['output']>
  areaName?: Maybe<Scalars['String']['output']>
  catalogItemId: Scalars['Int']['output']
  createdAt: Scalars['DateTime']['output']
  createdByClerkUserId?: Maybe<Scalars['String']['output']>
  direction: InventoryStockMovementDirection
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  note?: Maybe<Scalars['String']['output']>
  occurredOn: Scalars['Date']['output']
  quantity: Scalars['Float']['output']
  relatedLocationId?: Maybe<Scalars['Int']['output']>
  relatedMovementId?: Maybe<Scalars['Int']['output']>
  stockId?: Maybe<Scalars['Int']['output']>
  unitCost?: Maybe<Scalars['Float']['output']>
}

/** Result of moving packages between locations. */
export type InventoryStockTransferResult = {
  __typename?: 'InventoryStockTransferResult'
  fromLocationId: Scalars['Int']['output']
  fromStock?: Maybe<InventoryStockType>
  toLocationId: Scalars['Int']['output']
  toStock: InventoryStockType
}

/** Location stock level for a pantry catalog item. */
export type InventoryStockType = {
  __typename?: 'InventoryStockType'
  catalogItem: InventoryCatalogItemType
  catalogItemId: Scalars['Int']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  lastInOn?: Maybe<Scalars['Date']['output']>
  lastOutOn?: Maybe<Scalars['Date']['output']>
  lastUpdatedByClerkUserId?: Maybe<Scalars['String']['output']>
  locationId: Scalars['Int']['output']
  maxOnHand?: Maybe<Scalars['Float']['output']>
  minOnHand?: Maybe<Scalars['Float']['output']>
  onHand: Scalars['Float']['output']
  updatedAt: Scalars['DateTime']['output']
}

/** Primary storage area for a pantry item. */
export enum InventoryStorageZone {
  Cooler = 'cooler',
  Dry = 'dry',
  Freezer = 'freezer',
}

/** A retrieved knowledge chunk for advisor RAG. */
export type KnowledgeSearchHitType = {
  __typename?: 'KnowledgeSearchHitType'
  category: Scalars['String']['output']
  chunkId: Scalars['Int']['output']
  content: Scalars['String']['output']
  documentId: Scalars['Int']['output']
  /** Optional JSON metadata (e.g. chart_ids) as a string. */
  metadata?: Maybe<Scalars['String']['output']>
  scopeType: Scalars['String']['output']
  score: Scalars['Float']['output']
  slug: Scalars['String']['output']
  title: Scalars['String']['output']
}

/** Durable advisor-written notes for a location (preferences, constraints, outcomes). Separate from owner manualBriefInput.quickProfile. */
export type LocationAdvisorMemoryType = {
  __typename?: 'LocationAdvisorMemoryType'
  content: Scalars['String']['output']
  locationId: Scalars['Int']['output']
  updatedAt?: Maybe<Scalars['DateTime']['output']>
}

/** Summary of analytics runs for one location. */
export type LocationAnalyticsRunSummaryType = {
  __typename?: 'LocationAnalyticsRunSummaryType'
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
}

/** Run count and latest run for a location. */
export type LocationAnalyticsSummaryType = {
  __typename?: 'LocationAnalyticsSummaryType'
  latestRun?: Maybe<LocationAnalyticsRunSummaryType>
  locationId: Scalars['Int']['output']
  runCount: Scalars['Int']['output']
}

/** Named area within a location (e.g. Main room, Bar). */
export type LocationAreaType = {
  __typename?: 'LocationAreaType'
  id: Scalars['ID']['output']
  locationId: Scalars['ID']['output']
  name: Scalars['String']['output']
  sortOrder: Scalars['Int']['output']
}

/** Owner-provided click-first brief hints; not AI-generated. */
export type LocationManualBriefInputType = {
  __typename?: 'LocationManualBriefInputType'
  locationId: Scalars['Int']['output']
  quickProfile: Scalars['JSON']['output']
}

export type LocationMenuItemCogsType = {
  __typename?: 'LocationMenuItemCogsType'
  cogs: Scalars['Float']['output']
  createdAt: Scalars['DateTime']['output']
  currency?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  locationId: Scalars['Int']['output']
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

export type LocationMenuItemCogsUpsertInput = {
  cogs: Scalars['Float']['input']
  currency?: InputMaybe<Scalars['String']['input']>
  menuCategory?: InputMaybe<Scalars['String']['input']>
  menuCategoryDetail?: InputMaybe<Scalars['String']['input']>
  menuName: Scalars['String']['input']
}

/** Result of updating public digital menu settings. */
export type LocationPublicMenuSettingsType = {
  __typename?: 'LocationPublicMenuSettingsType'
  locationId: Scalars['Int']['output']
  menu: MenuType
  publicEnabled: Scalars['Boolean']['output']
  publicSlug?: Maybe<Scalars['String']['output']>
}

/** Result of updating a location public slug. */
export type LocationPublicSlugType = {
  __typename?: 'LocationPublicSlugType'
  locationId: Scalars['Int']['output']
  publicSlug?: Maybe<Scalars['String']['output']>
}

/** A restaurant location; ties POS data and product entities to a workspace or legacy owner. */
export type LocationType = {
  __typename?: 'LocationType'
  /** Durable advisor-written notes for this venue. Separate from owner manualBriefInput. */
  advisorMemory?: Maybe<LocationAdvisorMemoryType>
  areas: Array<LocationAreaType>
  city?: Maybe<Scalars['String']['output']>
  country?: Maybe<Scalars['String']['output']>
  currency?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  legalName?: Maybe<Scalars['String']['output']>
  /** Owner-provided click-first brief hints. Not AI-generated. */
  manualBriefInput?: Maybe<LocationManualBriefInputType>
  name: Scalars['String']['output']
  nodeId?: Maybe<Scalars['ID']['output']>
  openingHours: Array<OpeningHourType>
  publicSlug?: Maybe<Scalars['String']['output']>
  street?: Maybe<Scalars['String']['output']>
  taxNumber?: Maybe<Scalars['String']['output']>
  vatId?: Maybe<Scalars['String']['output']>
  workspaceId?: Maybe<Scalars['ID']['output']>
}

export type MatrixSignalItemType = {
  __typename?: 'MatrixSignalItemType'
  matrixCategory: Scalars['String']['output']
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  totalRevenue: Scalars['Float']['output']
}

export type MatrixSignalsType = {
  __typename?: 'MatrixSignalsType'
  avoidItems: Array<MatrixSignalItemType>
  contentHeroes: Array<MatrixSignalItemType>
}

export type MealPeriodBreakdownType = {
  __typename?: 'MealPeriodBreakdownType'
  label: Scalars['String']['output']
  orderCount: Scalars['Int']['output']
  period: Scalars['String']['output']
  revenue: Scalars['Float']['output']
  revenueShare: Scalars['Float']['output']
  share: Scalars['Float']['output']
}

/** Catalog entry for a workspace photo in the media library. */
export type MediaAssetType = {
  __typename?: 'MediaAssetType'
  createdByClerkUserId: Scalars['String']['output']
  displayName?: Maybe<Scalars['String']['output']>
  filename: Scalars['String']['output']
  id: Scalars['Int']['output']
  workspaceId: Scalars['Int']['output']
}

/** Named group of media assets within a workspace. */
export type MediaCollectionType = {
  __typename?: 'MediaCollectionType'
  createdByClerkUserId: Scalars['String']['output']
  id: Scalars['Int']['output']
  memberCount: Scalars['Int']['output']
  members: Array<MediaAssetType>
  name: Scalars['String']['output']
  workspaceId: Scalars['Int']['output']
}

/** Allergen present in a menu item. */
export enum MenuAllergen {
  Dairy = 'dairy',
  Eggs = 'eggs',
  Fish = 'fish',
  Gluten = 'gluten',
  Peanuts = 'peanuts',
  Sesame = 'sesame',
  Shellfish = 'shellfish',
  Soy = 'soy',
  TreeNuts = 'tree_nuts',
}

/** One distinct menu line from POS data with aggregated quantity and avg unit price. */
export type MenuCatalogItemType = {
  __typename?: 'MenuCatalogItemType'
  category: Scalars['String']['output']
  categoryDetail?: Maybe<Scalars['String']['output']>
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  price: Scalars['Float']['output']
  quantity: Scalars['Int']['output']
}

export type MenuCatalogPayloadType = {
  __typename?: 'MenuCatalogPayloadType'
  analyticsRunId: Scalars['ID']['output']
  items: Array<MenuCatalogItemType>
}

/** Category payload for replaceLocationMenuItems. */
export type MenuCategoryInput = {
  id?: InputMaybe<Scalars['Int']['input']>
  items: Array<MenuItemInput>
  name: Scalars['String']['input']
}

/** Named section on a location menu (e.g. Food, Drink). */
export type MenuCategoryType = {
  __typename?: 'MenuCategoryType'
  id: Scalars['Int']['output']
  items: Array<MenuItemType>
  menuId: Scalars['Int']['output']
  name: Scalars['String']['output']
  sortOrder: Scalars['Int']['output']
}

/** Timing analytics for when a combo pair is ordered together. */
export type MenuComboPairTimingType = {
  __typename?: 'MenuComboPairTimingType'
  dayMealCells: Array<ComboPairTimingCellType>
  hourlyCoOrders: Array<ComboPairTimingHourType>
  menuA: Scalars['String']['output']
  menuB: Scalars['String']['output']
  promoPosture: ComboPromoPostureType
  recommendedWindow: ComboPairRecommendedWindowType
}

/** Co-occurrence metrics for a pair of menu items within the same order. */
export type MenuComboPairType = {
  __typename?: 'MenuComboPairType'
  coOrderCount: Scalars['Int']['output']
  confidenceAToB: Scalars['Float']['output']
  confidenceBToA: Scalars['Float']['output']
  lift: Scalars['Float']['output']
  matrixCategoryA?: Maybe<Scalars['String']['output']>
  matrixCategoryB?: Maybe<Scalars['String']['output']>
  menuA: Scalars['String']['output']
  menuACategory?: Maybe<Scalars['String']['output']>
  menuB: Scalars['String']['output']
  menuBCategory?: Maybe<Scalars['String']['output']>
  support: Scalars['Float']['output']
}

/** Basket affinity analytics for an analytics run: which menu items appear together in orders, ranked by lift. */
export type MenuCombosPayloadType = {
  __typename?: 'MenuCombosPayloadType'
  avgDistinctItemsPerOrder: Scalars['Float']['output']
  focusMenus: Array<Scalars['String']['output']>
  matrixLift: Array<Array<Maybe<Scalars['Float']['output']>>>
  multiItemOrderCount: Scalars['Int']['output']
  pairs: Array<MenuComboPairType>
  scope: Scalars['String']['output']
  slotDemandProfile: Array<SlotDemandCellType>
  topPairTiming: Array<MenuComboPairTimingType>
  totalOrders: Scalars['Int']['output']
}

/** Dietary or lifestyle tag on a menu item. */
export enum MenuDietaryTag {
  DairyFree = 'dairy_free',
  GlutenFree = 'gluten_free',
  Halal = 'halal',
  Pescatarian = 'pescatarian',
  Spicy = 'spicy',
  Vegan = 'vegan',
  Vegetarian = 'vegetarian',
}

/** Share of items and margin contribution per BCG category (star, puzzle, plow_horse, weak). */
export type MenuEngineeringDistributionItemType = {
  __typename?: 'MenuEngineeringDistributionItemType'
  category: Scalars['String']['output']
  itemCount: Scalars['Int']['output']
  itemShare: Scalars['Float']['output']
  marginShare: Scalars['Float']['output']
}

/** A single menu item's position in the menu engineering BCG matrix, including its classification (star, puzzle, plow_horse, weak) and recommended action. */
export type MenuEngineeringMatrixItemType = {
  __typename?: 'MenuEngineeringMatrixItemType'
  action: Scalars['String']['output']
  category: Scalars['String']['output']
  cogs: Scalars['Float']['output']
  contributionMargin: Scalars['Float']['output']
  contributionMarginPercentage: Scalars['Float']['output']
  marginPerUnit: Scalars['Float']['output']
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  quantity: Scalars['Int']['output']
  totalCogs: Scalars['Float']['output']
  totalRevenue: Scalars['Float']['output']
  weValue: Scalars['Float']['output']
}

/** Full menu engineering BCG matrix for an analytics run. Contains portfolio thresholds, per-category distribution, and per-item classification. */
export type MenuEngineeringMatrixType = {
  __typename?: 'MenuEngineeringMatrixType'
  distribution: Array<MenuEngineeringDistributionItemType>
  items: Array<MenuEngineeringMatrixItemType>
  thresholds: MenuEngineeringThresholdsType
}

/** Portfolio-level thresholds used to classify menu items in the engineering matrix. avgPopularity and avgContributionMargin are the BCG quadrant cut-off values. */
export type MenuEngineeringThresholdsType = {
  __typename?: 'MenuEngineeringThresholdsType'
  avgContributionMargin: Scalars['Float']['output']
  avgPopularity: Scalars['Float']['output']
  totalCogs: Scalars['Float']['output']
  totalMargin: Scalars['Float']['output']
  totalProfit: Scalars['Float']['output']
}

/** Hourly and day-of-week demand heatmaps for a single menu item. Use this to understand when a dish sells best. */
export type MenuHeatmapType = {
  __typename?: 'MenuHeatmapType'
  dailyHeatmap: Array<DailyHeatmapType>
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  reportingPeriod: Scalars['String']['output']
  weeklyHeatmap: Array<WeeklyHeatmapType>
}

export type MenuItemCogsType = {
  __typename?: 'MenuItemCogsType'
  analyticsRunId: Scalars['Int']['output']
  cogs: Scalars['Float']['output']
  createdAt: Scalars['DateTime']['output']
  currency?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

export type MenuItemCogsUpsertInput = {
  cogs: Scalars['Float']['input']
  currency?: InputMaybe<Scalars['String']['input']>
  menuCategory?: InputMaybe<Scalars['String']['input']>
  menuCategoryDetail?: InputMaybe<Scalars['String']['input']>
  menuName: Scalars['String']['input']
}

/** Guest thumbs sentiment on a menu item. */
export enum MenuItemFeedbackSentiment {
  Negative = 'NEGATIVE',
  Positive = 'POSITIVE',
}

/** Moderation status for menu item feedback. */
export enum MenuItemFeedbackStatus {
  Hidden = 'HIDDEN',
  Pending = 'PENDING',
  Published = 'PUBLISHED',
}

/** Owner inbox row for menu item feedback. */
export type MenuItemFeedbackType = {
  __typename?: 'MenuItemFeedbackType'
  body: Scalars['String']['output']
  clerkUserId: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  guestDisplayName?: Maybe<Scalars['String']['output']>
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  menuItemId: Scalars['Int']['output']
  menuItemName: Scalars['String']['output']
  ownerRepliedAt?: Maybe<Scalars['DateTime']['output']>
  ownerReply?: Maybe<Scalars['String']['output']>
  posOrderId?: Maybe<Scalars['Int']['output']>
  publishedAt?: Maybe<Scalars['DateTime']['output']>
  sentiment?: Maybe<MenuItemFeedbackSentiment>
  status: MenuItemFeedbackStatus
  updatedAt: Scalars['DateTime']['output']
}

/** Item payload for replaceLocationMenuItems. */
export type MenuItemInput = {
  allergens?: InputMaybe<Array<MenuAllergen>>
  description?: InputMaybe<Scalars['String']['input']>
  dietaryTags?: InputMaybe<Array<MenuDietaryTag>>
  id?: InputMaybe<Scalars['Int']['input']>
  imageFilename?: InputMaybe<Scalars['String']['input']>
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>
  modifierGroups?: InputMaybe<Array<MenuModifierGroupInput>>
  name: Scalars['String']['input']
  price: Scalars['Float']['input']
  taxClass?: InputMaybe<Scalars['String']['input']>
}

/** One dish line on a location menu. */
export type MenuItemType = {
  __typename?: 'MenuItemType'
  allergens: Array<MenuAllergen>
  categoryId: Scalars['Int']['output']
  description: Scalars['String']['output']
  dietaryTags: Array<MenuDietaryTag>
  id: Scalars['Int']['output']
  imageFilename?: Maybe<Scalars['String']['output']>
  isAvailable: Scalars['Boolean']['output']
  menuId: Scalars['Int']['output']
  modifierGroups: Array<MenuModifierGroupType>
  name: Scalars['String']['output']
  price: Scalars['Float']['output']
  sortOrder: Scalars['Int']['output']
  taxClass: Scalars['String']['output']
}

/** Modifier group payload for replaceLocationMenuItems. */
export type MenuModifierGroupInput = {
  maxSelect?: Scalars['Int']['input']
  minSelect?: Scalars['Int']['input']
  name: Scalars['String']['input']
  options: Array<MenuModifierOptionInput>
}

/** Named choice group on a menu item (e.g. Size, Milk). */
export type MenuModifierGroupType = {
  __typename?: 'MenuModifierGroupType'
  id: Scalars['Int']['output']
  maxSelect: Scalars['Int']['output']
  menuItemId: Scalars['Int']['output']
  minSelect: Scalars['Int']['output']
  name: Scalars['String']['output']
  options: Array<MenuModifierOptionType>
  sortOrder: Scalars['Int']['output']
}

/** Option payload for replaceLocationMenuItems. */
export type MenuModifierOptionInput = {
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>
  name: Scalars['String']['input']
  priceDelta?: Scalars['Float']['input']
}

/** One selectable option in a menu modifier group. */
export type MenuModifierOptionType = {
  __typename?: 'MenuModifierOptionType'
  groupId: Scalars['Int']['output']
  id: Scalars['Int']['output']
  isAvailable: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  priceDelta: Scalars['Float']['output']
  sortOrder: Scalars['Int']['output']
}

/** Curated menu catalog for a location (one per location). */
export type MenuType = {
  __typename?: 'MenuType'
  allowDelivery: Scalars['Boolean']['output']
  allowDineIn: Scalars['Boolean']['output']
  allowPickup: Scalars['Boolean']['output']
  categories: Array<MenuCategoryType>
  headerImageFilename?: Maybe<Scalars['String']['output']>
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  orderingEnabled: Scalars['Boolean']['output']
  publicEnabled: Scalars['Boolean']['output']
  title: Scalars['String']['output']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type Mutation = {
  __typename?: 'Mutation'
  /** Activate (or re-activate) a service subscription for a location. Requires location ownership. Idempotent upsert to status=active. */
  activateServiceSubscription: ServiceSubscriptionType
  /** Add an explicit Food Profile preference. */
  addExplicitFoodPreference: FoodPreferenceType
  /** Add a photo (by filename) to a media collection. */
  addMediaToCollection: MediaCollectionType
  /** Add a menu item line to an open POS ticket. */
  addPosOrderLine: PosOrderType
  /** Advance digital-menu prep_status one step forward (received → preparing → ready → served|picked_up). */
  advancePosOrderPrepStatus: PosOrderType
  /** Refresh an analytics run's COGS snapshot from its location catalog. */
  applyLocationCogsToAnalyticsRun: Array<MenuItemCogsType>
  /** Cancel a service subscription for a location. Requires location ownership. Canceling digital_menu also unpublishes the public menu. */
  cancelServiceSubscription: ServiceSubscriptionType
  /** Clear location-scoped domain data for one service across a Clerk user's workspace and cancel that service's active subscriptions. Staff BFF only; blocked in production unless ALLOW_DEV_DATA_INGEST=1. */
  clearWorkspaceServiceData: ClearServiceDataResultType
  /** Close a pickup offer (e.g. sold out). Requires location ownership and an active pickup_offer subscription. */
  closePickupOffer: PickupOfferType
  /** Close (pay) an open POS ticket and project OrderFact rows onto the monthly Menuyukti POS analytics run. */
  closePosOrder: PosOrderType
  /** Close voting on a prediction without resolving. Requires location ownership and an active prediction subscription. */
  closePrediction: PredictionType
  /** Close voting on a voting without resolving. Requires location ownership and an active voting subscription. */
  closeVoting: VotingType
  /** Use packages from stock (decreases stock and records an out movement). */
  consumeInventoryStock: InventoryStockType
  /** Create a manual calendar entry for a location. */
  createCalendarEntry: CalendarEntryType
  /** Add a pantry item to the workspace catalog. */
  createInventoryCatalogItem: InventoryCatalogItemType
  /** Create a catalog item and initial stock at a location in one step. */
  createInventoryCatalogItemWithStock: InventoryStockType
  createLocation: LocationType
  /** Create a named area at a location. */
  createLocationArea: LocationAreaType
  /** Create a named media collection in the caller's workspace. */
  createMediaCollection: MediaCollectionType
  /** Create a pickup offer for a location. Requires location ownership and an active pickup_offer subscription. Rejects when another open offer exists. */
  createPickupOffer: PickupOfferType
  /** Create a playbook instance for a location. */
  createPlaybook: PlaybookType
  createPost: PostType
  createPostPage: PostPageType
  /** Create a prediction for a location. Requires location ownership and an active prediction subscription. reward_mode=points also requires point_system. */
  createPrediction: PredictionType
  /** Create a named visual style pack in the caller's workspace. */
  createStyle: StyleType
  /** Create a voting for a location. Requires location ownership, an active voting subscription, and an active point_system subscription. Rewards are points-only. The vote stays open until the owner closes it. */
  createVoting: VotingType
  /** Disabled. Use ensureMyWorkspace for self-serve default workspaces, or provisionWorkspace via the Menuyukti admin BFF for custom setups. */
  createWorkspace: WorkspaceType
  deleteAnalyticsRun: Scalars['Boolean']['output']
  /** Delete a manual calendar entry. */
  deleteCalendarEntry: CalendarEntryType
  /** Delete a pantry catalog item and all location stock rows. */
  deleteInventoryCatalogItem: Scalars['Boolean']['output']
  /** Stop tracking a catalog item at a location. */
  deleteInventoryStock: Scalars['Boolean']['output']
  /** Delete a location and its analytics, stock, and calendar data. Refused when paid or refunded POS tickets exist (fiscal retention). */
  deleteLocation: Scalars['Boolean']['output']
  /** Delete a location area. Prior stock movements keep history with a null area. */
  deleteLocationArea: Scalars['Boolean']['output']
  /** Delete a media asset catalog row by filename (memberships cascade). Returns true when a row was removed; false when already absent. */
  deleteMediaAsset: Scalars['Boolean']['output']
  /** Delete a media collection by id (memberships cascade). */
  deleteMediaCollection: Scalars['Boolean']['output']
  /** Delete Food Profile and preferences; retain consent evidence. */
  deleteMyFoodProfile: DeleteFoodProfileResultType
  /** Delete a playbook instance. */
  deletePlaybook: Scalars['Boolean']['output']
  deletePost: Scalars['Boolean']['output']
  deletePostPage: Scalars['Boolean']['output']
  deletePostPageMediaVersion: PostPageType
  /** Delete a visual style pack by id. */
  deleteStyle: Scalars['Boolean']['output']
  /** Idempotently create or update a media asset catalog row for a workspace photo filename. */
  ensureMediaAsset: MediaAssetType
  /** Get or create the primary workspace for the signed-in user. Creates a default owner workspace when none exists. Staff may still use provisionWorkspace for custom agency setups. */
  ensureMyWorkspace: WorkspaceType
  /** Export Food Profile JSON for the authenticated guest. */
  exportMyFoodProfile: FoodProfileExportType
  /** Grant Food Profile consent for a purpose. */
  grantFoodPreferenceConsent: MyFoodProfileType
  /** Location owner: hide a feedback note from the public menu. */
  hideMenuItemFeedback: MenuItemFeedbackType
  /** Create a new analytics run from paid Menuyukti POS tickets in an inclusive UTC date range. Always creates a new run (duplicates allowed). */
  importPosSalesReport: ImportPosSalesReportResult
  /** Run selective mock seed (inventar / analytics / all / clear-inventar) for a Clerk user's workspace. Same data as make dev-data. Staff BFF only; blocked in production unless ALLOW_DEV_DATA_INGEST=1. */
  ingestDevData: DevDataSeedResultType
  inviteWorkspaceMember: WorkspaceMembershipType
  /** Open a new POS ticket for a location. */
  openPosOrder: PosOrderType
  /** Create a workspace owned by the given Clerk user with the given plan. Intended for staff BFF only; not a customer self-serve path. Defaults to pro (agency-provisioned restaurant clients). */
  provisionWorkspace: WorkspaceType
  /** Location owner: publish a feedback note on the public menu item. */
  publishMenuItemFeedback: MenuItemFeedbackType
  /** Receive packages at a location (increases stock and records an in movement). */
  receiveInventoryStock: InventoryStockType
  /** Append an AI usage ledger row for the authenticated user (Leonardo generations and similar). */
  recordAiUsageEvent: AiUsageEventType
  /** Authenticated guest: record a Point System earn event for a location. Currently supports open_menu_qr (idempotent once per UTC day). No-ops when Point System is off or the rule is disabled. */
  recordPointEarnEvent: RecordPointEarnEventResultType
  /** Fully refund a paid POS ticket: insert compensating OrderFact rows and set status to refunded. Open/void tickets cannot be refunded. */
  refundPosOrder: PosOrderType
  /** Soft-delete a Food Profile preference. */
  removeFoodPreference: FoodPreferenceType
  /** Remove a photo (by filename) from a media collection. */
  removeMediaFromCollection: MediaCollectionType
  /** Remove a line from an open POS ticket. */
  removePosOrderLine: PosOrderType
  removeWorkspaceMember: Scalars['Boolean']['output']
  /** Replace all categories and items on the location's curated menu (creates the menu if needed). Pass an empty list to clear categories. */
  replaceLocationMenuItems: MenuType
  /** Location owner: save a reply on a feedback note. */
  replyMenuItemFeedback: MenuItemFeedbackType
  /** Mark the winning outcome and resolve the prediction. When reward_mode is points, awards correct voters via the point ledger. Requires location ownership and an active prediction subscription. */
  resolvePrediction: PredictionType
  /** Promote an analytics run's COGS snapshot into the location catalog. */
  saveAnalyticsRunCogsToLocation: Array<LocationMenuItemCogsType>
  /** Enable or disable cross-venue personalization globally. Enabling requires a new cross_venue_personalization consent (notice/version/method). */
  setCrossVenuePersonalization: MyFoodProfileType
  /** Enable or disable cross-venue portability for one preference. */
  setFoodPreferencePortability: FoodPreferenceType
  /** Set bill-level discount on an open POS ticket. */
  setPosOrderDiscount: PosOrderType
  /** Set or clear the note on an open POS ticket line. */
  setPosOrderLineNote: PosOrderType
  /** Set or clear the optional table label on an open POS ticket. Pass null or blank to clear. */
  setPosOrderTableLabel: PosOrderType
  /** Authenticated guest: leave feedback on a published digital-menu item. Creates a pending note for owner moderation. Optional posOrderId links the note to a digital-menu order the guest opened. */
  submitMenuItemFeedback: MenuItemFeedbackType
  /** Authenticated guest: open a POS ticket for a published digital menu and add lines. Rejects if the guest already has an open digital-menu ticket at this location (no append). No location ownership required. Close/pay remains staff-only. dine_in requires tableLabel; delivery requires address+phone; pickup clears table/delivery. */
  submitPublicMenuOrder: PosOrderType
  /** Move packages of a tracked item from one location to another. */
  transferInventoryStock: InventoryStockTransferResult
  /** Update a manual calendar entry. */
  updateCalendarEntry: CalendarEntryType
  /** Correct a Food Profile preference value. */
  updateFoodPreference: FoodPreferenceType
  /** Update a pantry catalog item. */
  updateInventoryCatalogItem: InventoryCatalogItemType
  /** Update lower/upper on-hand limits for location stock. */
  updateInventoryStockLimits: InventoryStockType
  updateLocation: LocationType
  /** Replace advisor memory for a location. Pass empty content to clear. Does not modify owner manualBriefInput / quickProfile. */
  updateLocationAdvisorMemory: LocationAdvisorMemoryType
  /** Rename or reorder a location area. */
  updateLocationArea: LocationAreaType
  /** Replace owner manual brief hints for a location. Pass quickProfile {} to clear. Does not modify AI-generated location_social_settings. */
  updateLocationManualBriefInput: LocationManualBriefInputType
  /** Publish or unpublish the location digital menu and set the public slug. Requires location ownership. Creates an empty menu when enabling if none exists. */
  updateLocationPublicMenu: LocationPublicMenuSettingsType
  /** Set or clear the location public URL slug. Requires location ownership. Does not require a digital_menu subscription. Reserved and duplicate slugs are rejected. */
  updateLocationPublicSlug: LocationPublicSlugType
  /** Rename a media collection by id. */
  updateMediaCollection: MediaCollectionType
  /** Update a playbook instance. */
  updatePlaybook: PlaybookType
  /** Update quantity on an open POS ticket line. */
  updatePosOrderLine: PosOrderType
  updatePost: PostType
  updatePostPage: PostPageType
  /** Update a visual style pack in the caller's workspace. */
  updateStyle: StyleType
  /** Set workspace.plan to free or pro. Intended for staff BFF only; not a customer self-serve upgrade path. */
  updateWorkspacePlan: WorkspaceType
  /** Upload and normalize a POS sales Excel file, persist order facts, and return metadata and sales analytics. Set includeLineItems to receive normalizedRows and orders (large payloads). Upload size is capped by MAX_SALES_REPORT_UPLOAD_BYTES (default 30 MiB). */
  uploadSalesReport: ExcelUploadResult
  /** Set current stock for a catalog item at a location. */
  upsertInventoryStock: InventoryStockType
  upsertLocationMenuItemCogsBulk: Array<LocationMenuItemCogsType>
  upsertMenuItemCogsBulk: Array<MenuItemCogsType>
  /** Create or update point earn rules for a location. Requires location ownership and an active point_system subscription. */
  upsertPointEarnRules: Array<PointEarnRuleType>
  /** Void an open POS ticket (no OrderFact projection). */
  voidPosOrder: PosOrderType
  /** Cast one vote on an open prediction. Requires authenticated Clerk guest. When reward_mode is points and points_for_vote > 0, credits the guest if Point System is active. */
  votePrediction: PredictionType
  /** Cast one vote on an open voting. Requires authenticated Clerk guest. When reward_mode is points and points_for_vote > 0, credits the guest if Point System is active. */
  voteVoting: VotingType
  /** Withdraw Food Profile consent for a purpose. */
  withdrawFoodPreferenceConsent: MyFoodProfileType
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationActivateServiceSubscriptionArgs = {
  locationId: Scalars['Int']['input']
  serviceKey: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationAddExplicitFoodPreferenceArgs = {
  explanation?: InputMaybe<Scalars['String']['input']>
  preferenceType: Scalars['String']['input']
  preferenceValue: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationAddMediaToCollectionArgs = {
  collectionId: Scalars['Int']['input']
  filename: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationAddPosOrderLineArgs = {
  menuItemId: Scalars['Int']['input']
  modifierOptionIds?: InputMaybe<Array<Scalars['Int']['input']>>
  note?: InputMaybe<Scalars['String']['input']>
  orderId: Scalars['Int']['input']
  qty?: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationAdvancePosOrderPrepStatusArgs = {
  orderId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationApplyLocationCogsToAnalyticsRunArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCancelServiceSubscriptionArgs = {
  locationId: Scalars['Int']['input']
  serviceKey: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationClearWorkspaceServiceDataArgs = {
  serviceKey: Scalars['String']['input']
  targetClerkUserId: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationClosePickupOfferArgs = {
  offerId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationClosePosOrderArgs = {
  orderId: Scalars['Int']['input']
  paymentMethod: PosPaymentMethod
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationClosePredictionArgs = {
  predictionId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCloseVotingArgs = {
  votingId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationConsumeInventoryStockArgs = {
  areaId?: InputMaybe<Scalars['Int']['input']>
  occurredOn?: InputMaybe<Scalars['Date']['input']>
  quantity: Scalars['Float']['input']
  stockId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateCalendarEntryArgs = {
  date: Scalars['String']['input']
  description?: InputMaybe<Scalars['String']['input']>
  locationId: Scalars['Int']['input']
  mediaRefs?: InputMaybe<Array<CalendarMediaRefInput>>
  time: Scalars['String']['input']
  title: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateInventoryCatalogItemArgs = {
  category?: InputMaybe<InventoryCategory>
  name: Scalars['String']['input']
  packageSize: Scalars['Float']['input']
  packageUnit: Scalars['String']['input']
  price?: InputMaybe<Scalars['Float']['input']>
  storageZone?: InputMaybe<InventoryStorageZone>
  workspaceId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateInventoryCatalogItemWithStockArgs = {
  category?: InputMaybe<InventoryCategory>
  locationId: Scalars['Int']['input']
  maxOnHand?: InputMaybe<Scalars['Float']['input']>
  minOnHand?: InputMaybe<Scalars['Float']['input']>
  name: Scalars['String']['input']
  onHand: Scalars['Float']['input']
  packageSize: Scalars['Float']['input']
  packageUnit: Scalars['String']['input']
  price?: InputMaybe<Scalars['Float']['input']>
  storageZone?: InputMaybe<InventoryStorageZone>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateLocationArgs = {
  city?: InputMaybe<Scalars['String']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  currency?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
  publicSlug?: InputMaybe<Scalars['String']['input']>
  street?: InputMaybe<Scalars['String']['input']>
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateLocationAreaArgs = {
  locationId: Scalars['Int']['input']
  name: Scalars['String']['input']
  sortOrder?: InputMaybe<Scalars['Int']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateMediaCollectionArgs = {
  name: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePickupOfferArgs = {
  input: CreatePickupOfferInput
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePlaybookArgs = {
  endDate: Scalars['String']['input']
  locationId: Scalars['Int']['input']
  name: Scalars['String']['input']
  playbookType: Scalars['String']['input']
  startDate: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePostArgs = {
  title?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePostPageArgs = {
  generationModel?: InputMaybe<Scalars['String']['input']>
  imageFormat?: InputMaybe<Scalars['String']['input']>
  imageQuality?: InputMaybe<Scalars['String']['input']>
  mediaS3Key?: InputMaybe<Scalars['String']['input']>
  postId: Scalars['ID']['input']
  prompt?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreatePredictionArgs = {
  input: CreatePredictionInput
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateStyleArgs = {
  isDefault?: Scalars['Boolean']['input']
  name: Scalars['String']['input']
  referenceImageName: Scalars['String']['input']
  spec: Scalars['JSON']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateVotingArgs = {
  input: CreateVotingInput
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationCreateWorkspaceArgs = {
  name: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteAnalyticsRunArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteCalendarEntryArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteInventoryCatalogItemArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteInventoryStockArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteLocationArgs = {
  id: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteLocationAreaArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteMediaAssetArgs = {
  filename: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteMediaCollectionArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePlaybookArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePostArgs = {
  id: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePostPageArgs = {
  pageId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeletePostPageMediaVersionArgs = {
  mediaS3Key: Scalars['String']['input']
  pageId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationDeleteStyleArgs = {
  id: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationEnsureMediaAssetArgs = {
  displayName?: InputMaybe<Scalars['String']['input']>
  filename: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationGrantFoodPreferenceConsentArgs = {
  allowedSignalCategories: Array<Scalars['String']['input']>
  collectionMethod: Scalars['String']['input']
  consentVersion: Scalars['String']['input']
  evidenceReference?: InputMaybe<Scalars['String']['input']>
  privacyNoticeVersion: Scalars['String']['input']
  purpose: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationHideMenuItemFeedbackArgs = {
  feedbackId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationImportPosSalesReportArgs = {
  endDate: Scalars['Date']['input']
  locationId: Scalars['ID']['input']
  startDate: Scalars['Date']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationIngestDevDataArgs = {
  scope: Scalars['String']['input']
  targetClerkUserId: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationInviteWorkspaceMemberArgs = {
  clerkUserId: Scalars['String']['input']
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationOpenPosOrderArgs = {
  locationId: Scalars['Int']['input']
  tableLabel?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationProvisionWorkspaceArgs = {
  name: Scalars['String']['input']
  ownerClerkUserId: Scalars['String']['input']
  plan?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationPublishMenuItemFeedbackArgs = {
  feedbackId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationReceiveInventoryStockArgs = {
  catalogItemId: Scalars['Int']['input']
  locationId: Scalars['Int']['input']
  occurredOn?: InputMaybe<Scalars['Date']['input']>
  quantity: Scalars['Float']['input']
  unitCost?: InputMaybe<Scalars['Float']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRecordAiUsageEventArgs = {
  externalId?: InputMaybe<Scalars['String']['input']>
  feature: Scalars['String']['input']
  metadata?: InputMaybe<Scalars['JSON']['input']>
  model?: InputMaybe<Scalars['String']['input']>
  provider: Scalars['String']['input']
  status: Scalars['String']['input']
  units?: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRecordPointEarnEventArgs = {
  actionKey: Scalars['String']['input']
  locationId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRefundPosOrderArgs = {
  orderId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRemoveFoodPreferenceArgs = {
  id: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRemoveMediaFromCollectionArgs = {
  collectionId: Scalars['Int']['input']
  filename: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRemovePosOrderLineArgs = {
  lineId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationRemoveWorkspaceMemberArgs = {
  clerkUserId: Scalars['String']['input']
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationReplaceLocationMenuItemsArgs = {
  categories: Array<MenuCategoryInput>
  locationId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationReplyMenuItemFeedbackArgs = {
  feedbackId: Scalars['Int']['input']
  reply: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationResolvePredictionArgs = {
  predictionId: Scalars['Int']['input']
  winningOutcomeId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSaveAnalyticsRunCogsToLocationArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSetCrossVenuePersonalizationArgs = {
  allowedSignalCategories?: InputMaybe<Array<Scalars['String']['input']>>
  collectionMethod?: InputMaybe<Scalars['String']['input']>
  consentVersion?: InputMaybe<Scalars['String']['input']>
  enabled: Scalars['Boolean']['input']
  evidenceReference?: InputMaybe<Scalars['String']['input']>
  privacyNoticeVersion?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSetFoodPreferencePortabilityArgs = {
  enabled: Scalars['Boolean']['input']
  id: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSetPosOrderDiscountArgs = {
  amount: Scalars['Float']['input']
  orderId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSetPosOrderLineNoteArgs = {
  lineId: Scalars['Int']['input']
  note?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSetPosOrderTableLabelArgs = {
  orderId: Scalars['Int']['input']
  tableLabel?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSubmitMenuItemFeedbackArgs = {
  body: Scalars['String']['input']
  guestDisplayName?: InputMaybe<Scalars['String']['input']>
  locationId: Scalars['Int']['input']
  menuItemId: Scalars['Int']['input']
  posOrderId?: InputMaybe<Scalars['Int']['input']>
  sentiment?: InputMaybe<MenuItemFeedbackSentiment>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationSubmitPublicMenuOrderArgs = {
  deliveryAddress?: InputMaybe<Scalars['String']['input']>
  deliveryNotes?: InputMaybe<Scalars['String']['input']>
  deliveryPhone?: InputMaybe<Scalars['String']['input']>
  fulfillmentMode: PosFulfillmentMode
  lines: Array<PublicMenuOrderLineInput>
  locationId: Scalars['Int']['input']
  tableLabel?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationTransferInventoryStockArgs = {
  fromStockId: Scalars['Int']['input']
  occurredOn?: InputMaybe<Scalars['Date']['input']>
  quantity: Scalars['Float']['input']
  toLocationId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateCalendarEntryArgs = {
  date?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  id: Scalars['Int']['input']
  mediaRefs?: InputMaybe<Array<CalendarMediaRefInput>>
  time?: InputMaybe<Scalars['String']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateFoodPreferenceArgs = {
  id: Scalars['ID']['input']
  preferenceValue: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateInventoryCatalogItemArgs = {
  category?: InputMaybe<InventoryCategory>
  id: Scalars['Int']['input']
  name?: InputMaybe<Scalars['String']['input']>
  packageSize?: InputMaybe<Scalars['Float']['input']>
  packageUnit?: InputMaybe<Scalars['String']['input']>
  price?: InputMaybe<Scalars['Float']['input']>
  storageZone?: InputMaybe<InventoryStorageZone>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateInventoryStockLimitsArgs = {
  id: Scalars['Int']['input']
  maxOnHand?: InputMaybe<Scalars['Float']['input']>
  minOnHand?: InputMaybe<Scalars['Float']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationArgs = {
  city?: InputMaybe<Scalars['String']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  currency?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  legalName?: InputMaybe<Scalars['String']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  openingHours?: InputMaybe<Array<OpeningHourInput>>
  publicSlug?: InputMaybe<Scalars['String']['input']>
  street?: InputMaybe<Scalars['String']['input']>
  taxNumber?: InputMaybe<Scalars['String']['input']>
  vatId?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationAdvisorMemoryArgs = {
  content: Scalars['String']['input']
  locationId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationAreaArgs = {
  id: Scalars['Int']['input']
  name?: InputMaybe<Scalars['String']['input']>
  sortOrder?: InputMaybe<Scalars['Int']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationManualBriefInputArgs = {
  locationId: Scalars['Int']['input']
  quickProfile: Scalars['JSON']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationPublicMenuArgs = {
  allowDelivery?: InputMaybe<Scalars['Boolean']['input']>
  allowDineIn?: InputMaybe<Scalars['Boolean']['input']>
  allowPickup?: InputMaybe<Scalars['Boolean']['input']>
  headerImageFilename?: InputMaybe<Scalars['String']['input']>
  locationId: Scalars['Int']['input']
  orderingEnabled?: InputMaybe<Scalars['Boolean']['input']>
  publicEnabled?: InputMaybe<Scalars['Boolean']['input']>
  publicSlug?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateLocationPublicSlugArgs = {
  locationId: Scalars['Int']['input']
  publicSlug?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateMediaCollectionArgs = {
  id: Scalars['Int']['input']
  name: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdatePlaybookArgs = {
  endDate: Scalars['String']['input']
  id: Scalars['Int']['input']
  locationId: Scalars['Int']['input']
  name: Scalars['String']['input']
  startDate: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdatePosOrderLineArgs = {
  lineId: Scalars['Int']['input']
  qty: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdatePostArgs = {
  id: Scalars['ID']['input']
  title: Scalars['String']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdatePostPageArgs = {
  generationModel?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  imageFormat?: InputMaybe<Scalars['String']['input']>
  imageQuality?: InputMaybe<Scalars['String']['input']>
  mediaS3Key?: InputMaybe<Scalars['String']['input']>
  prompt?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateStyleArgs = {
  id: Scalars['Int']['input']
  isDefault?: InputMaybe<Scalars['Boolean']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  referenceImageName?: InputMaybe<Scalars['String']['input']>
  spec?: InputMaybe<Scalars['JSON']['input']>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpdateWorkspacePlanArgs = {
  plan: Scalars['String']['input']
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUploadSalesReportArgs = {
  file: Scalars['Upload']['input']
  includeLineItems?: Scalars['Boolean']['input']
  locationId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertInventoryStockArgs = {
  catalogItemId: Scalars['Int']['input']
  locationId: Scalars['Int']['input']
  onHand: Scalars['Float']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertLocationMenuItemCogsBulkArgs = {
  items: Array<LocationMenuItemCogsUpsertInput>
  locationId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertMenuItemCogsBulkArgs = {
  analyticsRunId: Scalars['ID']['input']
  items: Array<MenuItemCogsUpsertInput>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationUpsertPointEarnRulesArgs = {
  locationId: Scalars['Int']['input']
  rules: Array<PointEarnRuleInput>
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationVoidPosOrderArgs = {
  orderId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationVotePredictionArgs = {
  outcomeId: Scalars['Int']['input']
  predictionId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationVoteVotingArgs = {
  optionId: Scalars['Int']['input']
  votingId: Scalars['Int']['input']
}

/** Root mutation: sales uploads, workspace invites, and catalog writes. */
export type MutationWithdrawFoodPreferenceConsentArgs = {
  purpose: Scalars['String']['input']
}

/** Guest Food Profile summary. */
export type MyFoodProfileType = {
  __typename?: 'MyFoodProfileType'
  activeConsents: Array<FoodPreferenceConsentType>
  crossVenuePersonalizationEnabled: Scalars['Boolean']['output']
  profileId?: Maybe<Scalars['String']['output']>
  status?: Maybe<Scalars['String']['output']>
}

/** Guest point balance at one location. */
export type MyPointBalanceType = {
  __typename?: 'MyPointBalanceType'
  balance: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  locationName: Scalars['String']['output']
}

/** One ledger credit/debit for the authenticated guest. */
export type MyPointEntryType = {
  __typename?: 'MyPointEntryType'
  actionKey: Scalars['String']['output']
  amount: Scalars['Int']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['String']['output']
  label?: Maybe<Scalars['String']['output']>
  locationId: Scalars['Int']['output']
  locationName: Scalars['String']['output']
}

export type NormalizedLineItem = {
  __typename?: 'NormalizedLineItem'
  billNumber: Scalars['String']['output']
  menu: Scalars['String']['output']
  menuCategory: Scalars['String']['output']
  menuCategoryDetail: Scalars['String']['output']
  orderTime: Scalars['DateTime']['output']
  price: Scalars['Float']['output']
  qty: Scalars['Int']['output']
  totalAfterBillDiscount: Scalars['Float']['output']
}

export type OpeningHourInput = {
  closeTime: Scalars['String']['input']
  dayOfWeek: Scalars['String']['input']
  openTime: Scalars['String']['input']
}

/** Opening hours for one weekday. */
export type OpeningHourType = {
  __typename?: 'OpeningHourType'
  closeTime: Scalars['String']['output']
  dayOfWeek: Scalars['String']['output']
  openTime: Scalars['String']['output']
}

export type OperatingProfileType = {
  __typename?: 'OperatingProfileType'
  activeDaysCount: Scalars['Int']['output']
  activeMealPeriods: Array<Scalars['String']['output']>
  avgDailyOrders: Scalars['Float']['output']
  avgOrderSize: Scalars['Float']['output']
  dayOfWeekBreakdown: Array<DayOfWeekBreakdownType>
  dayTypeBreakdown: Array<DayTypeBreakdownType>
  diningFocus: Scalars['String']['output']
  mealPeriodBreakdown: Array<MealPeriodBreakdownType>
  operatingPattern: Scalars['String']['output']
  peakDay: Scalars['String']['output']
  primaryMealPeriod: Scalars['String']['output']
  totalOrders: Scalars['Int']['output']
  totalRevenue: Scalars['Float']['output']
  weekdayShare: Scalars['Float']['output']
  weekendShare: Scalars['Float']['output']
}

export type OrderItemType = {
  __typename?: 'OrderItemType'
  menu: Scalars['String']['output']
  menuCategory: Scalars['String']['output']
  menuCategoryDetail: Scalars['String']['output']
  price: Scalars['Float']['output']
  qty: Scalars['Int']['output']
  totalAfterBillDiscount: Scalars['Float']['output']
}

export type OrderSignalsType = {
  __typename?: 'OrderSignalsType'
  avgOrderItems: Scalars['Float']['output']
  avgOrderRevenue: Scalars['Float']['output']
  maxOrderItems: Scalars['Int']['output']
  maxOrderRevenue: Scalars['Float']['output']
  minOrderItems: Scalars['Int']['output']
  minOrderRevenue: Scalars['Float']['output']
  totalOrders: Scalars['Int']['output']
}

export type OrderType = {
  __typename?: 'OrderType'
  billNumber: Scalars['String']['output']
  items: Array<OrderItemType>
  orderTime: Scalars['DateTime']['output']
}

export type PeriodHeadlineType = {
  __typename?: 'PeriodHeadlineType'
  periodEnd: Scalars['String']['output']
  periodStart: Scalars['String']['output']
  previousPeriodTotalRevenue: Scalars['Float']['output']
  revenueVsPreviousPct?: Maybe<Scalars['Float']['output']>
  totalRevenue: Scalars['Float']['output']
}

/** A location pickup offer guests can discover and collect. */
export type PickupOfferType = {
  __typename?: 'PickupOfferType'
  availableFrom: Scalars['DateTime']['output']
  availableUntil: Scalars['DateTime']['output']
  createdAt: Scalars['DateTime']['output']
  description: Scalars['String']['output']
  id: Scalars['Int']['output']
  isLive: Scalars['Boolean']['output']
  locationId: Scalars['Int']['output']
  locationName: Scalars['String']['output']
  price?: Maybe<Scalars['Float']['output']>
  status: Scalars['String']['output']
  title: Scalars['String']['output']
}

/** A saved playbook instance for a location and date window. */
export type PlaybookType = {
  __typename?: 'PlaybookType'
  endDate: Scalars['String']['output']
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  name: Scalars['String']['output']
  playbookType: Scalars['String']['output']
  startDate: Scalars['String']['output']
}

/** Upsert payload for one point earn rule. */
export type PointEarnRuleInput = {
  actionKey: Scalars['String']['input']
  enabled: Scalars['Boolean']['input']
  points: Scalars['Int']['input']
}

/** Earn rule for one known Point System action at a location. */
export type PointEarnRuleType = {
  __typename?: 'PointEarnRuleType'
  actionKey: Scalars['String']['output']
  enabled: Scalars['Boolean']['output']
  points: Scalars['Int']['output']
}

/** Append-only POS audit event. */
export type PosAuditEventType = {
  __typename?: 'PosAuditEventType'
  action: Scalars['String']['output']
  actorClerkUserId: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  payloadJson: Scalars['String']['output']
  posOrderId?: Maybe<Scalars['Int']['output']>
}

/** Day close / Z-lite summary for native POS. */
export type PosDayPaymentTotalType = {
  __typename?: 'PosDayPaymentTotalType'
  grossTotal: Scalars['Float']['output']
  paymentMethod: PosPaymentMethod
  ticketCount: Scalars['Int']['output']
}

/** Native POS day summary for a location. */
export type PosDaySummaryType = {
  __typename?: 'PosDaySummaryType'
  locationId: Scalars['Int']['output']
  onDate: Scalars['String']['output']
  openCount: Scalars['Int']['output']
  openTicketsRemaining: Scalars['Int']['output']
  paidByPaymentMethod: Array<PosDayPaymentTotalType>
  paidCount: Scalars['Int']['output']
  paidDiscountTotal: Scalars['Float']['output']
  refundedCount: Scalars['Int']['output']
  refundedGrossTotal: Scalars['Float']['output']
  voidCount: Scalars['Int']['output']
}

/** Fiscalization / TSE process snapshot for a POS ticket. */
export type PosFiscalProcessType = {
  __typename?: 'PosFiscalProcessType'
  certificateSerial?: Maybe<Scalars['String']['output']>
  clientId?: Maybe<Scalars['String']['output']>
  finishedAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['Int']['output']
  kind: Scalars['String']['output']
  lastError?: Maybe<Scalars['String']['output']>
  processType: Scalars['String']['output']
  provider: Scalars['String']['output']
  qrPayload?: Maybe<Scalars['String']['output']>
  signatureCounter?: Maybe<Scalars['Int']['output']>
  startedAt?: Maybe<Scalars['DateTime']['output']>
  state: Scalars['String']['output']
  tseSignature?: Maybe<Scalars['String']['output']>
  tseTransactionId?: Maybe<Scalars['String']['output']>
}

/** How a digital-menu (or similar) ticket should be fulfilled. */
export enum PosFulfillmentMode {
  Delivery = 'DELIVERY',
  DineIn = 'DINE_IN',
  Pickup = 'PICKUP',
}

/** Selected modifier snapshot on a POS line. */
export type PosOrderLineModifierType = {
  __typename?: 'PosOrderLineModifierType'
  groupNameSnapshot: Scalars['String']['output']
  id: Scalars['Int']['output']
  nameSnapshot: Scalars['String']['output']
  posOrderLineId: Scalars['Int']['output']
  priceDeltaSnapshot: Scalars['Float']['output']
  sortOrder: Scalars['Int']['output']
}

/** One line on a POS ticket with price/name/tax snapshots. */
export type PosOrderLineType = {
  __typename?: 'PosOrderLineType'
  id: Scalars['Int']['output']
  lineTotal: Scalars['Float']['output']
  menuCategoryDetailSnapshot: Scalars['String']['output']
  menuCategorySnapshot: Scalars['String']['output']
  menuItemId: Scalars['Int']['output']
  modifiers: Array<PosOrderLineModifierType>
  nameSnapshot: Scalars['String']['output']
  net: Scalars['Float']['output']
  note?: Maybe<Scalars['String']['output']>
  posOrderId: Scalars['Int']['output']
  qty: Scalars['Int']['output']
  sortOrder: Scalars['Int']['output']
  tax: Scalars['Float']['output']
  taxClass: Scalars['String']['output']
  taxRateBps: Scalars['Int']['output']
  unitPrice: Scalars['Float']['output']
}

/** Lifecycle status of a POS ticket. */
export enum PosOrderStatus {
  Open = 'OPEN',
  Paid = 'PAID',
  Refunded = 'REFUNDED',
  Void = 'VOID',
}

/** Native POS ticket (operational truth). */
export type PosOrderType = {
  __typename?: 'PosOrderType'
  billNumber: Scalars['String']['output']
  closedAt?: Maybe<Scalars['DateTime']['output']>
  deliveryAddress?: Maybe<Scalars['String']['output']>
  deliveryNotes?: Maybe<Scalars['String']['output']>
  deliveryPhone?: Maybe<Scalars['String']['output']>
  discountAmount: Scalars['Float']['output']
  fiscalProcesses: Array<PosFiscalProcessType>
  fulfillmentMode?: Maybe<PosFulfillmentMode>
  gross: Scalars['Float']['output']
  id: Scalars['Int']['output']
  lines: Array<PosOrderLineType>
  locationId: Scalars['Int']['output']
  net: Scalars['Float']['output']
  note?: Maybe<Scalars['String']['output']>
  openedAt: Scalars['DateTime']['output']
  openedByClerkUserId: Scalars['String']['output']
  paymentMethod?: Maybe<PosPaymentMethod>
  prepStatus?: Maybe<PosPrepStatus>
  refundedAt?: Maybe<Scalars['DateTime']['output']>
  registerId?: Maybe<Scalars['Int']['output']>
  status: PosOrderStatus
  tableLabel?: Maybe<Scalars['String']['output']>
  tax: Scalars['Float']['output']
  taxBreakdown: Array<PosTaxBreakdownType>
}

/** Recorded payment method on close (no processor in v1). */
export enum PosPaymentMethod {
  Card = 'CARD',
  Cash = 'CASH',
  Other = 'OTHER',
}

/** Kitchen / fulfillment prep status (independent of payment). */
export enum PosPrepStatus {
  Delivered = 'DELIVERED',
  PickedUp = 'PICKED_UP',
  Preparing = 'PREPARING',
  Ready = 'READY',
  Received = 'RECEIVED',
  Served = 'SERVED',
}

/** VAT breakdown bucket for a POS ticket (euros). */
export type PosTaxBreakdownType = {
  __typename?: 'PosTaxBreakdownType'
  gross: Scalars['Float']['output']
  net: Scalars['Float']['output']
  tax: Scalars['Float']['output']
  taxRateBps: Scalars['Int']['output']
}

/** A single generated image version for a post page. */
export type PostPageMediaVersionType = {
  __typename?: 'PostPageMediaVersionType'
  createdAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  mediaS3Key: Scalars['String']['output']
  prompt?: Maybe<Scalars['String']['output']>
}

/** A single page/slide within an Instagram post. */
export type PostPageType = {
  __typename?: 'PostPageType'
  createdAt?: Maybe<Scalars['DateTime']['output']>
  generationModel?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  imageFormat?: Maybe<Scalars['String']['output']>
  imageQuality?: Maybe<Scalars['String']['output']>
  mediaS3Key?: Maybe<Scalars['String']['output']>
  mediaVersions: Array<PostPageMediaVersionType>
  prompt?: Maybe<Scalars['String']['output']>
  sortOrder: Scalars['Int']['output']
  updatedAt?: Maybe<Scalars['DateTime']['output']>
}

/** A standalone Instagram post draft or published post. */
export type PostType = {
  __typename?: 'PostType'
  caption?: Maybe<Scalars['String']['output']>
  createdAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  locationId?: Maybe<Scalars['Int']['output']>
  mediaType?: Maybe<Scalars['String']['output']>
  pages: Array<PostPageType>
  status: Scalars['String']['output']
  title?: Maybe<Scalars['String']['output']>
  updatedAt?: Maybe<Scalars['DateTime']['output']>
  workspaceId?: Maybe<Scalars['ID']['output']>
}

/** One outcome option on a prediction. */
export type PredictionOutcomeType = {
  __typename?: 'PredictionOutcomeType'
  id: Scalars['Int']['output']
  label: Scalars['String']['output']
  sortOrder: Scalars['Int']['output']
}

/** A location prediction guests can vote on. */
export type PredictionType = {
  __typename?: 'PredictionType'
  closesAt: Scalars['DateTime']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  locationName: Scalars['String']['output']
  myVote?: Maybe<PredictionVoteType>
  outcomes: Array<PredictionOutcomeType>
  pointsForCorrect: Scalars['Int']['output']
  pointsForVote: Scalars['Int']['output']
  question: Scalars['String']['output']
  resolvedAt?: Maybe<Scalars['DateTime']['output']>
  rewardMode: Scalars['String']['output']
  status: Scalars['String']['output']
  voteCount: Scalars['Int']['output']
  winningOutcomeId?: Maybe<Scalars['Int']['output']>
}

/** A guest's vote on a prediction. */
export type PredictionVoteType = {
  __typename?: 'PredictionVoteType'
  clerkUserId: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  outcomeId: Scalars['Int']['output']
}

/** Per-menu signals for choosing promotion content: sales totals, optional menu-engineering classification when COGS exist, and optional peak demand timing. */
export type PromotionMenuItemType = {
  __typename?: 'PromotionMenuItemType'
  action?: Maybe<Scalars['String']['output']>
  category?: Maybe<Scalars['String']['output']>
  cogs?: Maybe<Scalars['Float']['output']>
  contributionMargin?: Maybe<Scalars['Float']['output']>
  contributionMarginPercentage?: Maybe<Scalars['Float']['output']>
  marginPerUnit?: Maybe<Scalars['Float']['output']>
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  peakDay?: Maybe<Scalars['String']['output']>
  peakHour?: Maybe<Scalars['Int']['output']>
  quantity: Scalars['Int']['output']
  totalCogs?: Maybe<Scalars['Float']['output']>
  totalRevenue: Scalars['Float']['output']
  weValue?: Maybe<Scalars['Float']['output']>
}

/** Analytics-run scoped list of menu items with data to support promotion picks. Engineering fields are null when the menu engineering matrix cannot be computed (e.g. missing COGS) or when an item is excluded from the matrix (no unit COGS). */
export type PromotionMenuItemsPayloadType = {
  __typename?: 'PromotionMenuItemsPayloadType'
  analyticsRunId: Scalars['ID']['output']
  items: Array<PromotionMenuItemType>
  /** Menus evaluated before applying the promotion list cap (same as pre-cap row count). */
  itemsTotalCount: Scalars['Int']['output']
  /** True when more menus existed than returned in items (see cap in API docs). */
  itemsTruncated: Scalars['Boolean']['output']
  periodEnd?: Maybe<Scalars['Date']['output']>
  periodStart?: Maybe<Scalars['Date']['output']>
}

export type PublicHolidayType = {
  __typename?: 'PublicHolidayType'
  date: Scalars['String']['output']
  holidayType: Scalars['String']['output']
  id: Scalars['String']['output']
  isTentative: Scalars['Boolean']['output']
  localName: Scalars['String']['output']
  name: Scalars['String']['output']
}

/** One discoverable venue card for the public explore directory. */
export type PublicLocationDirectoryItemType = {
  __typename?: 'PublicLocationDirectoryItemType'
  city?: Maybe<Scalars['String']['output']>
  hasPickupOffer: Scalars['Boolean']['output']
  headerImageFilename?: Maybe<Scalars['String']['output']>
  id: Scalars['Int']['output']
  mediaOwnerClerkUserId?: Maybe<Scalars['String']['output']>
  menuDishCount: Scalars['Int']['output']
  name: Scalars['String']['output']
  pickupOfferAvailableUntil?: Maybe<Scalars['DateTime']['output']>
  pickupOfferPrice?: Maybe<Scalars['Float']['output']>
  pickupOfferTitle?: Maybe<Scalars['String']['output']>
  publicSlug: Scalars['String']['output']
  workspaceId?: Maybe<Scalars['ID']['output']>
}

/** Public explore directory: distinct cities for chips plus matching venues with a published digital menu. */
export type PublicLocationDirectoryType = {
  __typename?: 'PublicLocationDirectoryType'
  cities: Array<Scalars['String']['output']>
  locations: Array<PublicLocationDirectoryItemType>
}

/** Public digital menu for a location. Null when the slug is unknown or the menu is not published. */
export type PublicLocationMenuType = {
  __typename?: 'PublicLocationMenuType'
  allowDelivery: Scalars['Boolean']['output']
  allowDineIn: Scalars['Boolean']['output']
  allowPickup: Scalars['Boolean']['output']
  categories: Array<PublicMenuCategoryType>
  currency?: Maybe<Scalars['String']['output']>
  headerImageFilename?: Maybe<Scalars['String']['output']>
  locationId: Scalars['Int']['output']
  mediaOwnerClerkUserId?: Maybe<Scalars['String']['output']>
  name: Scalars['String']['output']
  orderingEnabled: Scalars['Boolean']['output']
  publicSlug: Scalars['String']['output']
  workspaceId?: Maybe<Scalars['ID']['output']>
}

/** Teaser for a live pickup offer shown on the public location hub. */
export type PublicLocationPickupOfferTeaserType = {
  __typename?: 'PublicLocationPickupOfferTeaserType'
  availableUntil: Scalars['DateTime']['output']
  price?: Maybe<Scalars['Float']['output']>
  title: Scalars['String']['output']
}

/** Teaser for open predictions shown on the public location hub. */
export type PublicLocationPredictionTeaserType = {
  __typename?: 'PublicLocationPredictionTeaserType'
  openCount: Scalars['Int']['output']
  pointsForCorrect: Scalars['Int']['output']
  pointsForVote: Scalars['Int']['output']
  question: Scalars['String']['output']
  rewardMode: Scalars['String']['output']
}

/** One guest-facing service entry on a public location hub. */
export type PublicLocationServiceType = {
  __typename?: 'PublicLocationServiceType'
  available: Scalars['Boolean']['output']
  hrefSegment: Scalars['String']['output']
  key: Scalars['String']['output']
}

/** Public location hub by slug. Returned when the slug exists; services may all be unavailable (greeting-only home). */
export type PublicLocationType = {
  __typename?: 'PublicLocationType'
  headerImageFilename?: Maybe<Scalars['String']['output']>
  id: Scalars['Int']['output']
  mediaOwnerClerkUserId?: Maybe<Scalars['String']['output']>
  menuDishCount?: Maybe<Scalars['Int']['output']>
  menuOpenPoints?: Maybe<Scalars['Int']['output']>
  name: Scalars['String']['output']
  pickupOfferTeaser?: Maybe<PublicLocationPickupOfferTeaserType>
  predictionTeaser?: Maybe<PublicLocationPredictionTeaserType>
  publicSlug: Scalars['String']['output']
  services: Array<PublicLocationServiceType>
  votingTeaser?: Maybe<PublicLocationVotingTeaserType>
  workspaceId?: Maybe<Scalars['ID']['output']>
}

/** Teaser for open votings shown on the public location hub. */
export type PublicLocationVotingTeaserType = {
  __typename?: 'PublicLocationVotingTeaserType'
  openCount: Scalars['Int']['output']
  pointsForVote: Scalars['Int']['output']
  question: Scalars['String']['output']
  rewardMode: Scalars['String']['output']
}

/** One category section on the public digital menu. */
export type PublicMenuCategoryType = {
  __typename?: 'PublicMenuCategoryType'
  items: Array<PublicMenuItemType>
  name: Scalars['String']['output']
  sortOrder: Scalars['Int']['output']
}

/** One published guest note shown on the public menu item. */
export type PublicMenuItemFeedbackType = {
  __typename?: 'PublicMenuItemFeedbackType'
  body: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  guestDisplayName?: Maybe<Scalars['String']['output']>
  ownerReply?: Maybe<Scalars['String']['output']>
  sentiment?: Maybe<MenuItemFeedbackSentiment>
}

/** One available item on the public digital menu. */
export type PublicMenuItemType = {
  __typename?: 'PublicMenuItemType'
  allergens: Array<MenuAllergen>
  description: Scalars['String']['output']
  dietaryTags: Array<MenuDietaryTag>
  id: Scalars['Int']['output']
  imageFilename?: Maybe<Scalars['String']['output']>
  name: Scalars['String']['output']
  price: Scalars['Float']['output']
  publishedFeedbackCount: Scalars['Int']['output']
  publishedFeedbacks: Array<PublicMenuItemFeedbackType>
  sortOrder: Scalars['Int']['output']
}

/** Guest-facing line on a digital-menu ticket. */
export type PublicMenuOrderLineGuestType = {
  __typename?: 'PublicMenuOrderLineGuestType'
  menuItemId: Scalars['Int']['output']
  name: Scalars['String']['output']
}

/** One line on a guest digital-menu order. */
export type PublicMenuOrderLineInput = {
  menuItemId: Scalars['Int']['input']
  qty?: Scalars['Int']['input']
}

/** Guest-facing digital-menu order status. Lines are included when loading the caller's open ticket; status polls may return an empty line list. */
export type PublicMenuOrderStatusType = {
  __typename?: 'PublicMenuOrderStatusType'
  billNumber: Scalars['String']['output']
  deliveryAddress?: Maybe<Scalars['String']['output']>
  deliveryNotes?: Maybe<Scalars['String']['output']>
  deliveryPhone?: Maybe<Scalars['String']['output']>
  fulfillmentMode?: Maybe<PosFulfillmentMode>
  id: Scalars['Int']['output']
  lines: Array<PublicMenuOrderLineGuestType>
  prepStatus?: Maybe<PosPrepStatus>
  status: PosOrderStatus
  tableLabel?: Maybe<Scalars['String']['output']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type Query = {
  __typename?: 'Query'
  /** Return multiple analytics sections for one run using a shared OrderFact load. Use options to omit sections you do not need. */
  analyticsBundle?: Maybe<AnalyticsBundleType>
  /** Fetch metadata and COGS for a single analytics run by ID. */
  analyticsRun?: Maybe<AnalyticsRunType>
  /** List analytics runs for a location, newest first. Use `first` to cap rows (default 100, max 300). */
  analyticsRuns: Array<AnalyticsRunListItemType>
  /** Revenue and quantity share per menu category for an analytics run. Returns null when the run has no order lines. */
  categoryMix?: Maybe<CategoryMixPayloadType>
  /** Composite Instagram signals for an analytics run: content heroes, trending items, avoid list, category focus, best posting window, and period headline. Requires order facts; returns null if none. */
  instagramSignals?: Maybe<InstagramSignalsType>
  /** Pantry catalog for a workspace. Empty when unauthenticated or not a member. */
  inventoryCatalogItems: Array<InventoryCatalogItemType>
  /** Ranked refill forecast for stock at a location from recent out / transfer_out burn. Empty when not authorized. windowDays defaults to 14 and is clamped between 7 and 90. */
  inventoryRefillForecast: Array<InventoryRefillForecastItem>
  /** Stock levels at a location (joined with catalog). Empty when not authorized. */
  inventoryStock: Array<InventoryStockType>
  /** Stock movements for a catalog item at a location, newest first. When stockId is set, only movements for that stock row (current track). Optional fromDate/toDate filter occurredOn inclusively. Empty when not authorized or fromDate is after toDate. */
  inventoryStockMovements: Array<InventoryStockMovementType>
  /** Fetch one location by id if the caller has access. */
  location?: Maybe<LocationType>
  /** Analytics run counts and latest run per location in one query. Only returns summaries for locations the caller can access. */
  locationAnalyticsSummaries: Array<LocationAnalyticsSummaryType>
  /** Curated guest menu for a location. Null when missing, unauthenticated, or the caller is not an owner. */
  locationMenu?: Maybe<MenuType>
  /** Location-scoped COGS catalog. Empty when unauthenticated or not an owner. */
  locationMenuItemCogs: Array<LocationMenuItemCogsType>
  /** Location owner: count of pending (new) menu item feedback. */
  locationMenuItemFeedbackPendingCount: Scalars['Int']['output']
  /** Location owner: list menu item feedback for the digital menu inbox. Optional status filter. Returns empty when unauthenticated or not owner. */
  locationMenuItemFeedbacks: Array<MenuItemFeedbackType>
  /** All locations the current user can access (direct owner or workspace member). */
  locations: Array<LocationType>
  /** List media assets (photos) in the caller's workspaces. When collectionId is set, only members of that collection. */
  mediaAssets: Array<MediaAssetType>
  /** Fetch one media collection by id, including member assets. Null when missing. */
  mediaCollection?: Maybe<MediaCollectionType>
  /** List media collections in workspaces the current user belongs to. */
  mediaCollections: Array<MediaCollectionType>
  /** Return basket affinity analytics for an analytics run: menu pairs ordered together, with lift and confidence metrics. Defaults to star items when menu engineering matrix is available; otherwise top items by order presence. When locationId is set, the run must belong to that location. */
  menuCombos?: Maybe<MenuCombosPayloadType>
  /** Compute the menu engineering BCG matrix for an analytics run. Requires COGS to be set; returns None if no COGS are available. Optionally filter returned items to specific categories (star, puzzle, plow_horse, weak) — thresholds and distribution always reflect the full dataset. When locationId is set, the run must belong to that location (otherwise returns null). */
  menuEngineeringMatrix?: Maybe<MenuEngineeringMatrixType>
  /** Return hourly and day-of-week demand heatmaps for every menu item in an analytics run. Use this to identify peak selling times per dish. When locationId is set, the run must belong to that location (otherwise returns an empty list). */
  menuHeatmaps: Array<MenuHeatmapType>
  /** Distinct menu items from the latest analytics run for a location: aggregated from order lines (category, avg unit price). Returns null when there is no run or no order data. */
  menuItemsCatalog?: Maybe<MenuCatalogPayloadType>
  /** Distinct menu items from a specific analytics run: aggregated from order lines (quantity, category, avg unit price). Returns null when run is missing/unauthorized or has no order data. */
  menuItemsCatalogForRun?: Maybe<MenuCatalogPayloadType>
  /** Aggregated AI usage for the authenticated user in [startDate, endDate] (UTC dates). */
  myAiUsageSummary?: Maybe<AiUsageSummaryType>
  /** One Food Profile preference by id for the authenticated guest. */
  myFoodPreference?: Maybe<FoodPreferenceType>
  /** List Food Profile preferences for the authenticated guest. Empty when unauthenticated. */
  myFoodPreferences: Array<FoodPreferenceType>
  /** Food Profile summary for the authenticated Clerk guest (global switch + active consents). Empty fields when unauthenticated. */
  myFoodProfile?: Maybe<MyFoodProfileType>
  /** Guest predictions at locations the authenticated guest has visited (point ledger or digital-menu orders), with an active prediction subscription. Includes open predictions, plus closed and recently resolved ones the guest voted on. Empty when unauthenticated. */
  myOpenPredictions: Array<PredictionType>
  /** Signed-in guest: latest open digital-menu ticket at this location (for restoring My order after reload when local storage is empty). */
  myOpenPublicMenuOrder?: Maybe<PublicMenuOrderStatusType>
  /** Open guest votings at locations the authenticated guest has visited (point ledger or digital-menu orders), with an active voting subscription. Closed votings are hidden. Empty when unauthenticated. */
  myOpenVotings: Array<VotingType>
  /** Point balances for the authenticated Clerk user, one row per location with ledger activity. Empty when unauthenticated or no activity. */
  myPointBalances: Array<MyPointBalanceType>
  /** Recent point ledger entries for the authenticated Clerk user (newest first). Empty when unauthenticated. */
  myPointEntries: Array<MyPointEntryType>
  /** Service subscriptions for workspaces the current user belongs to. Defaults to active only; set includeCanceled for history. */
  myServiceSubscriptions: Array<ServiceSubscriptionType>
  myWorkspace?: Maybe<WorkspaceType>
  operatingProfile?: Maybe<OperatingProfileType>
  /** Compute average order size and revenue for an analytics run. Returns None if the run has no order data. */
  orderMetrics?: Maybe<AnalyticsRunOrderMetricsType>
  /** List pickup offers for a location. Requires location ownership. Empty when unauthenticated or not an owner. */
  pickupOffers: Array<PickupOfferType>
  /** A single playbook instance by id, if the caller can access it. */
  playbook?: Maybe<PlaybookType>
  /** Playbook instances of a given type for all locations the caller can access. */
  playbooks: Array<PlaybookType>
  /** Point earn rules for a location (full catalog merged with saved values). Requires ownership and an active point_system subscription; otherwise []. */
  pointEarnRules: Array<PointEarnRuleType>
  /** Append-only audit events for a POS ticket (owner-only). */
  posAuditEvents: Array<PosAuditEventType>
  /** Day close / Z-lite summary for native POS tickets. */
  posDaySummary?: Maybe<PosDaySummaryType>
  /** Load a single POS ticket by id. */
  posOrder?: Maybe<PosOrderType>
  /** List POS tickets for a location. Defaults to tickets opened since start of the current Europe/Berlin business day. Optional note and prepStatus filter digital-menu Order board tickets. */
  posOrders: Array<PosOrderType>
  /** A single post in the caller's workspace, with pages. */
  post?: Maybe<PostType>
  /** Posts in workspaces the current user belongs to, newest first. */
  posts: Array<PostType>
  /** List predictions for a location. Requires location ownership. Empty when unauthenticated or not an owner. */
  predictions: Array<PredictionType>
  /** Return per-menu promotion signals for an analytics run: volume and revenue, optional BCG-style menu-engineering metrics when COGS allow, and peak hour/day from demand heatmaps. When locationId is set, the run must belong to that location (otherwise returns null). */
  promotionMenuItems?: Maybe<PromotionMenuItemsPayloadType>
  publicHolidays: Array<PublicHolidayType>
  /** Public location hub by slug. Returns null when the slug is unknown. No authentication required. */
  publicLocation?: Maybe<PublicLocationType>
  /** Public digital menu by location slug. Returns null when the slug is missing or the menu is not published. No authentication required. */
  publicLocationMenu?: Maybe<PublicLocationMenuType>
  /** Live pickup offer for a public location slug when pickup_offer is active and the offer window is open. Null when unknown, inactive, or no live offer. */
  publicLocationPickupOffer?: Maybe<PickupOfferType>
  /** Guest-visible predictions for a public location slug when Prediction is active: open, closed (awaiting result), and recently resolved. Empty when the slug is unknown or Prediction is off. Includes myVote when the caller is authenticated. */
  publicLocationPredictions: Array<PredictionType>
  /** Guest-visible open votings for a public location slug when Voting is active. Closed votings are hidden from guests. Empty when the slug is unknown or Voting is off. Includes myVote when the caller is authenticated. */
  publicLocationVotings: Array<VotingType>
  /** Discoverable venues with a published digital menu. Optional city (exact, case-insensitive) and free-text query on name/city. No authentication required. */
  publicLocations: PublicLocationDirectoryType
  /** Guest status poll for a digital-menu order the caller opened. Returns null if unauthenticated, not the opener, or not a digital-menu ticket. */
  publicMenuOrder?: Maybe<PublicMenuOrderStatusType>
  /** Compare per-menu revenue for an analytics run against the previous run for the same location (or an explicit previousRunId). Returns null when the current run has no order lines. */
  revenueTrends?: Maybe<RevenueTrendsPayloadType>
  /** Manual calendar entries for a location. Returns an empty payload when the caller is unauthenticated, does not own the location, or there are no manual entries. */
  schedulerCalendar: SchedulerCalendarPayload
  /** Semantic search over published knowledge (domain, KPI, playbook). Returns only chunks the caller may access (global + authorized scopes). */
  searchKnowledge: Array<KnowledgeSearchHitType>
  /** Fetch one visual style pack by id. Null when missing or access denied. */
  style?: Maybe<StyleType>
  /** List visual style packs in workspaces the current user belongs to. */
  styles: Array<StyleType>
  /** List votings for a location. Requires location ownership. Empty when unauthenticated or not an owner. */
  votings: Array<VotingType>
  workspaceMembers: Array<WorkspaceMembershipType>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryAnalyticsBundleArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
  options?: InputMaybe<AnalyticsBundleOptionsInput>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryAnalyticsRunArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryAnalyticsRunsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryCategoryMixArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInstagramSignalsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryCatalogItemsArgs = {
  workspaceId: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryRefillForecastArgs = {
  locationId: Scalars['ID']['input']
  windowDays?: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryStockArgs = {
  locationId: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryInventoryStockMovementsArgs = {
  catalogItemId: Scalars['ID']['input']
  fromDate?: InputMaybe<Scalars['Date']['input']>
  limit?: Scalars['Int']['input']
  locationId: Scalars['ID']['input']
  stockId?: InputMaybe<Scalars['ID']['input']>
  toDate?: InputMaybe<Scalars['Date']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationAnalyticsSummariesArgs = {
  locationIds: Array<Scalars['Int']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationMenuArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationMenuItemCogsArgs = {
  locationId: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationMenuItemFeedbackPendingCountArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationMenuItemFeedbacksArgs = {
  locationId: Scalars['Int']['input']
  status?: InputMaybe<MenuItemFeedbackStatus>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryLocationsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMediaAssetsArgs = {
  collectionId?: InputMaybe<Scalars['Int']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMediaCollectionArgs = {
  id: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMediaCollectionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuCombosArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuEngineeringMatrixArgs = {
  analyticsRunId: Scalars['ID']['input']
  categories?: InputMaybe<Array<Scalars['String']['input']>>
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuHeatmapsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuItemsCatalogArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMenuItemsCatalogForRunArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyAiUsageSummaryArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>
  startDate?: InputMaybe<Scalars['String']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyFoodPreferenceArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyFoodPreferencesArgs = {
  includeRemoved?: Scalars['Boolean']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyOpenPublicMenuOrderArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyPointEntriesArgs = {
  limit?: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryMyServiceSubscriptionsArgs = {
  includeCanceled?: Scalars['Boolean']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryOperatingProfileArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryOrderMetricsArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPickupOffersArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPlaybookArgs = {
  id: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPlaybooksArgs = {
  playbookType: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPointEarnRulesArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPosAuditEventsArgs = {
  orderId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPosDaySummaryArgs = {
  locationId: Scalars['Int']['input']
  onDate?: InputMaybe<Scalars['String']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPosOrderArgs = {
  id: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPosOrdersArgs = {
  locationId: Scalars['Int']['input']
  note?: InputMaybe<Scalars['String']['input']>
  prepStatus?: InputMaybe<PosPrepStatus>
  since?: InputMaybe<Scalars['DateTime']['input']>
  status?: InputMaybe<PosOrderStatus>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPostArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPostsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPredictionsArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPromotionMenuItemsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicHolidaysArgs = {
  country: Scalars['String']['input']
  endDate: Scalars['String']['input']
  startDate: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicLocationArgs = {
  slug: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicLocationMenuArgs = {
  slug: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicLocationPickupOfferArgs = {
  slug: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicLocationPredictionsArgs = {
  slug: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicLocationVotingsArgs = {
  slug: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicLocationsArgs = {
  city?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  hasPickupOffer?: InputMaybe<Scalars['Boolean']['input']>
  query?: InputMaybe<Scalars['String']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryPublicMenuOrderArgs = {
  orderId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryRevenueTrendsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
  previousRunId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QuerySchedulerCalendarArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QuerySearchKnowledgeArgs = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>
  chartIds?: InputMaybe<Array<Scalars['String']['input']>>
  limit?: InputMaybe<Scalars['Int']['input']>
  locationId?: InputMaybe<Scalars['Int']['input']>
  query: Scalars['String']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryStyleArgs = {
  id: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryStylesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryVotingsArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, sales analytics runs, menu engineering, heatmaps, and workspace membership. */
export type QueryWorkspaceMembersArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
  workspaceId: Scalars['ID']['input']
}

/** Result of recording a guest point-earn event. */
export type RecordPointEarnEventResultType = {
  __typename?: 'RecordPointEarnEventResultType'
  awarded: Scalars['Boolean']['output']
  balance: Scalars['Int']['output']
}

/** Per-menu revenue comparison between two analytics periods. */
export type RevenueTrendRowGqlType = {
  __typename?: 'RevenueTrendRowGqlType'
  changePct?: Maybe<Scalars['Float']['output']>
  currentRevenue: Scalars['Float']['output']
  menu: Scalars['String']['output']
  previousRevenue: Scalars['Float']['output']
  rankCurrent: Scalars['Int']['output']
  rankPrevious: Scalars['Int']['output']
  trendLabel: Scalars['String']['output']
}

/** Revenue trends for an analytics run vs a baseline period. */
export type RevenueTrendsPayloadType = {
  __typename?: 'RevenueTrendsPayloadType'
  analyticsRunId: Scalars['ID']['output']
  currentPeriodTotalRevenue: Scalars['Float']['output']
  previousPeriodTotalRevenue: Scalars['Float']['output']
  rows: Array<RevenueTrendRowGqlType>
}

/** A public holiday overlay for the calendar window. */
export type SchedulerCalendarHolidayType = {
  __typename?: 'SchedulerCalendarHolidayType'
  date: Scalars['String']['output']
  description: Scalars['String']['output']
  name: Scalars['String']['output']
}

/** Location-scoped calendar of manual calendar entries. Public holidays are not populated by this query. */
export type SchedulerCalendarPayload = {
  __typename?: 'SchedulerCalendarPayload'
  publicHolidays: Array<SchedulerCalendarHolidayType>
  slots: Array<SchedulerCalendarSlotType>
  windowEnd?: Maybe<Scalars['String']['output']>
  windowStart?: Maybe<Scalars['String']['output']>
}

/** A scheduled content slot (feed post, Story, or Reel). */
export type SchedulerCalendarSlotType = {
  __typename?: 'SchedulerCalendarSlotType'
  date: Scalars['String']['output']
  description?: Maybe<Scalars['String']['output']>
  id?: Maybe<Scalars['String']['output']>
  kind?: Maybe<Scalars['String']['output']>
  mediaRefs?: Maybe<Array<CalendarMediaRefType>>
  source?: Maybe<Scalars['String']['output']>
  time: Scalars['String']['output']
  title: Scalars['String']['output']
}

/** Entitlement for a catalog service on one location (digital_menu, stamp_card, voting, …). */
export type ServiceSubscriptionType = {
  __typename?: 'ServiceSubscriptionType'
  canceledAt?: Maybe<Scalars['DateTime']['output']>
  createdAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  locationId: Scalars['ID']['output']
  serviceKey: Scalars['String']['output']
  status: Scalars['String']['output']
  updatedAt?: Maybe<Scalars['DateTime']['output']>
  workspaceId: Scalars['ID']['output']
}

export type SignalConfidenceType = {
  __typename?: 'SignalConfidenceType'
  coverageNotes: Array<Scalars['String']['output']>
  tier: Scalars['String']['output']
}

/** Venue demand for one day and meal-period slot. */
export type SlotDemandCellType = {
  __typename?: 'SlotDemandCellType'
  day: Scalars['String']['output']
  demandIndex: Scalars['Float']['output']
  mealPeriod: Scalars['String']['output']
  mealPeriodHoursLabel: Scalars['String']['output']
  mealPeriodLabel: Scalars['String']['output']
  orderCount: Scalars['Int']['output']
  relativeDemand: Scalars['String']['output']
  trafficShare: Scalars['Float']['output']
}

/** Workspace-scoped visual style pack: Style Spec v2 JSON plus one media-library reference image used when generating Instagram posts. */
export type StyleType = {
  __typename?: 'StyleType'
  createdByClerkUserId: Scalars['String']['output']
  id: Scalars['Int']['output']
  isDefault: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  referenceImageName: Scalars['String']['output']
  rules: Scalars['String']['output']
  spec: Scalars['JSON']['output']
  workspaceId: Scalars['Int']['output']
}

/** A menu item with rising revenue vs the prior period. */
export type TrendingItemType = {
  __typename?: 'TrendingItemType'
  changePct?: Maybe<Scalars['Float']['output']>
  currentRevenue: Scalars['Float']['output']
  menu: Scalars['String']['output']
  previousRevenue: Scalars['Float']['output']
  rankCurrent: Scalars['Int']['output']
  rankPrevious: Scalars['Int']['output']
  trendLabel: Scalars['String']['output']
}

/** One option on a voting. */
export type VotingOptionType = {
  __typename?: 'VotingOptionType'
  id: Scalars['Int']['output']
  label: Scalars['String']['output']
  sortOrder: Scalars['Int']['output']
}

/** A location voting guests can vote on. */
export type VotingType = {
  __typename?: 'VotingType'
  closesAt?: Maybe<Scalars['DateTime']['output']>
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  locationId: Scalars['Int']['output']
  locationName: Scalars['String']['output']
  myVote?: Maybe<VotingVoteType>
  options: Array<VotingOptionType>
  pointsForCorrect: Scalars['Int']['output']
  pointsForVote: Scalars['Int']['output']
  question: Scalars['String']['output']
  resolvedAt?: Maybe<Scalars['DateTime']['output']>
  rewardMode: Scalars['String']['output']
  status: Scalars['String']['output']
  voteCount: Scalars['Int']['output']
  winningOptionId?: Maybe<Scalars['Int']['output']>
}

/** A guest's vote on a voting. */
export type VotingVoteType = {
  __typename?: 'VotingVoteType'
  clerkUserId: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  id: Scalars['Int']['output']
  optionId: Scalars['Int']['output']
}

/** Day-of-week demand distribution for a menu item. */
export type WeeklyHeatmapType = {
  __typename?: 'WeeklyHeatmapType'
  day: Scalars['String']['output']
  quantity: Scalars['Int']['output']
}

export type WorkspaceMembershipType = {
  __typename?: 'WorkspaceMembershipType'
  acceptedAt?: Maybe<Scalars['DateTime']['output']>
  clerkUserId: Scalars['String']['output']
  id: Scalars['ID']['output']
  invitedAt?: Maybe<Scalars['DateTime']['output']>
  role: Scalars['String']['output']
  workspaceId: Scalars['ID']['output']
}

/** A tenant workspace; locations can belong to a workspace with role-based membership. */
export type WorkspaceType = {
  __typename?: 'WorkspaceType'
  createdAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  ownerClerkUserId: Scalars['String']['output']
  plan: Scalars['String']['output']
}
