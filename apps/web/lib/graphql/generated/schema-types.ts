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
  datetimeSignals?: Maybe<DatetimeSignalsType>
  matrixSignals: MatrixSignalsType
  orderSignals?: Maybe<OrderSignalsType>
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

/** Workspace-owned tool definition for custom agent integrations (endpoint invoked at runtime). */
export type ApiAdapterToolType = {
  __typename?: 'ApiAdapterToolType'
  createdAt: Scalars['DateTime']['output']
  description: Scalars['String']['output']
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  toolKey: Scalars['String']['output']
  updatedAt: Scalars['DateTime']['output']
  url: Scalars['String']['output']
  workspaceId: Scalars['ID']['output']
}

export type BestPostingWindowType = {
  __typename?: 'BestPostingWindowType'
  peakDay?: Maybe<Scalars['String']['output']>
  peakHour?: Maybe<Scalars['Int']['output']>
  peakRevenueDay?: Maybe<Scalars['String']['output']>
  peakRevenueMealPeriod?: Maybe<Scalars['String']['output']>
  primaryMealPeriod?: Maybe<Scalars['String']['output']>
}

export type CampaignBriefSignalCapabilitiesType = {
  __typename?: 'CampaignBriefSignalCapabilitiesType'
  enabledBlocks: Array<Scalars['String']['output']>
  hasDatetime: Scalars['Boolean']['output']
  hasOrderId: Scalars['Boolean']['output']
}

export type CampaignSchedulePlanType = {
  __typename?: 'CampaignSchedulePlanType'
  analyticsRunId: Scalars['ID']['output']
  campaignEnd: Scalars['String']['output']
  campaignStart: Scalars['String']['output']
  postsPerWeek: Scalars['Int']['output']
  slots: Array<CampaignScheduleSlotType>
  sourceSignalsSummary: Scalars['String']['output']
  timezone: Scalars['String']['output']
}

export type CampaignScheduleSlotType = {
  __typename?: 'CampaignScheduleSlotType'
  captionIdea: Scalars['String']['output']
  dateTime: Scalars['String']['output']
  postType: Scalars['String']['output']
  promotedMenuItems: Array<Scalars['String']['output']>
  visualIdea: Scalars['String']['output']
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

export type ImageAiFlowType = {
  __typename?: 'ImageAiFlowType'
  displayName: Scalars['String']['output']
  id: Scalars['Int']['output']
  imageReferenceStrength?: Maybe<Scalars['String']['output']>
  isActive: Scalars['Boolean']['output']
  model: Scalars['String']['output']
  prompt: Scalars['String']['output']
  promptEnhance?: Maybe<Scalars['String']['output']>
  slug: Scalars['String']['output']
  sortOrder: Scalars['Int']['output']
  styleIds?: Maybe<Scalars['JSON']['output']>
}

/** Tiered analytics payload for campaign_brief and growth agents. */
export type InstagramSignalsType = {
  __typename?: 'InstagramSignalsType'
  additionalSignals: AdditionalSignalsType
  analyticsRunId: Scalars['ID']['output']
  capabilities: CampaignBriefSignalCapabilitiesType
  fundamentalSignals: FundamentalSignalsType
}

/** Owner-provided click-first brief hints; not AI-generated. */
export type LocationManualBriefInputType = {
  __typename?: 'LocationManualBriefInputType'
  locationId: Scalars['Int']['output']
  quickProfile: Scalars['JSON']['output']
}

export type LocationSocialSettingsType = {
  __typename?: 'LocationSocialSettingsType'
  avoidTopics: Array<Scalars['String']['output']>
  brandHashtags: Array<Scalars['String']['output']>
  brandPersonality?: Maybe<Scalars['String']['output']>
  contentPillars: Array<Scalars['String']['output']>
  locationId: Scalars['Int']['output']
  platformFocus: Array<Scalars['String']['output']>
  targetAudience?: Maybe<Scalars['String']['output']>
  tone?: Maybe<Scalars['String']['output']>
}

/** A restaurant location; ties POS data and workflow roots to a workspace or legacy owner. */
export type LocationType = {
  __typename?: 'LocationType'
  city?: Maybe<Scalars['String']['output']>
  country?: Maybe<Scalars['String']['output']>
  currency?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  /** Owner-provided click-first brief hints. Not AI-generated — see locationSocialSettings for AI output. */
  manualBriefInput?: Maybe<LocationManualBriefInputType>
  name: Scalars['String']['output']
  nodeId?: Maybe<Scalars['ID']['output']>
  openingHours: Array<OpeningHourType>
  street?: Maybe<Scalars['String']['output']>
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

/** Share of items and margin contribution per BCG category (star, puzzle, plow_horse, low_end). */
export type MenuEngineeringDistributionItemType = {
  __typename?: 'MenuEngineeringDistributionItemType'
  category: Scalars['String']['output']
  itemCount: Scalars['Int']['output']
  itemShare: Scalars['Float']['output']
  marginShare: Scalars['Float']['output']
}

/** A single menu item's position in the menu engineering BCG matrix, including its classification (star, puzzle, plow_horse, low_end) and recommended action. */
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

export type MenuItemCogsUpdateInput = {
  cogs: Scalars['Float']['input']
  id: Scalars['ID']['input']
}

export type MenuItemCogsUpsertInput = {
  cogs: Scalars['Float']['input']
  currency?: InputMaybe<Scalars['String']['input']>
  menuCategory?: InputMaybe<Scalars['String']['input']>
  menuCategoryDetail?: InputMaybe<Scalars['String']['input']>
  menuName: Scalars['String']['input']
}

/** A milestone node plus its passcriteria, milestonedata, and result children. */
export type MilestoneCampaignBundleType = {
  __typename?: 'MilestoneCampaignBundleType'
  milestone: NodeType
  milestonedataNodes: Array<NodeType>
  passCriteriaNodes: Array<NodeType>
  resultNodes: Array<NodeType>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type Mutation = {
  __typename?: 'Mutation'
  completeMilestoneAgentRun: Scalars['Boolean']['output']
  createApiAdapterTool: ApiAdapterToolType
  createImageAiFlow: ImageAiFlowType
  createLocation: LocationType
  createNode: NodeType
  createWorkspace: WorkspaceType
  deleteAnalyticsRun: Scalars['Boolean']['output']
  deleteApiAdapterTool: Scalars['Boolean']['output']
  deleteImageAiFlow: Scalars['Boolean']['output']
  deleteNode: Scalars['Boolean']['output']
  exportWorkflow: WorkflowExportType
  importWorkflow: NodeType
  inviteWorkspaceMember: WorkspaceMembershipType
  removeWorkspaceMember: Scalars['Boolean']['output']
  replacePassCriteria: Scalars['Boolean']['output']
  startMilestoneAgentRun: Scalars['Boolean']['output']
  updateApiAdapterTool: ApiAdapterToolType
  updateImageAiFlow: ImageAiFlowType
  updateLocation: LocationType
  /** Replace owner manual brief hints for a location. Pass quickProfile {} to clear. Does not modify AI-generated location_social_settings. */
  updateLocationManualBriefInput: LocationManualBriefInputType
  updateMenuItemCogsBulk: Array<MenuItemCogsType>
  updateNode: NodeType
  /** Upload and normalize a POS sales Excel file, persist order facts, and return metadata and sales analytics. Set includeLineItems to receive normalizedRows and orders (large payloads). Upload size is capped by MAX_SALES_REPORT_UPLOAD_BYTES (default 30 MiB). */
  uploadSalesReport: ExcelUploadResult
  upsertMenuItemCogsBulk: Array<MenuItemCogsType>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationCompleteMilestoneAgentRunArgs = {
  errorMessage?: InputMaybe<Scalars['String']['input']>
  externalTraceId?: InputMaybe<Scalars['String']['input']>
  externalTraceUrl?: InputMaybe<Scalars['String']['input']>
  runId: Scalars['String']['input']
  status: Scalars['String']['input']
  summary?: InputMaybe<Scalars['JSON']['input']>
  timeline?: InputMaybe<Scalars['JSON']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationCreateApiAdapterToolArgs = {
  description: Scalars['String']['input']
  isActive?: Scalars['Boolean']['input']
  name: Scalars['String']['input']
  url: Scalars['String']['input']
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationCreateImageAiFlowArgs = {
  displayName: Scalars['String']['input']
  imageReferenceStrength?: InputMaybe<Scalars['String']['input']>
  isActive?: Scalars['Boolean']['input']
  model: Scalars['String']['input']
  prompt: Scalars['String']['input']
  promptEnhance?: InputMaybe<Scalars['String']['input']>
  slug: Scalars['String']['input']
  sortOrder?: Scalars['Int']['input']
  styleIds?: InputMaybe<Scalars['JSON']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationCreateLocationArgs = {
  city?: InputMaybe<Scalars['String']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  currency?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
  street?: InputMaybe<Scalars['String']['input']>
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationCreateNodeArgs = {
  data?: InputMaybe<Scalars['JSON']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  locationId: Scalars['Int']['input']
  name?: InputMaybe<Scalars['String']['input']>
  nodeType: Scalars['String']['input']
  parentId?: InputMaybe<Scalars['ID']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationCreateWorkspaceArgs = {
  name: Scalars['String']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationDeleteAnalyticsRunArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationDeleteApiAdapterToolArgs = {
  id: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationDeleteImageAiFlowArgs = {
  slug: Scalars['String']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationDeleteNodeArgs = {
  id: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationExportWorkflowArgs = {
  locationId: Scalars['Int']['input']
  workflowId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationImportWorkflowArgs = {
  locationId: Scalars['Int']['input']
  payload: Scalars['JSON']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationInviteWorkspaceMemberArgs = {
  clerkUserId: Scalars['String']['input']
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationRemoveWorkspaceMemberArgs = {
  clerkUserId: Scalars['String']['input']
  workspaceId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationReplacePassCriteriaArgs = {
  locationId: Scalars['Int']['input']
  milestoneId: Scalars['ID']['input']
  requirements: Array<Scalars['String']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationStartMilestoneAgentRunArgs = {
  milestoneId: Scalars['ID']['input']
  runId: Scalars['String']['input']
  traceparent?: InputMaybe<Scalars['String']['input']>
  workflowId?: InputMaybe<Scalars['ID']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpdateApiAdapterToolArgs = {
  description?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  isActive?: InputMaybe<Scalars['Boolean']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  url?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpdateImageAiFlowArgs = {
  displayName?: InputMaybe<Scalars['String']['input']>
  imageReferenceStrength?: InputMaybe<Scalars['String']['input']>
  isActive?: InputMaybe<Scalars['Boolean']['input']>
  model?: InputMaybe<Scalars['String']['input']>
  newSlug?: InputMaybe<Scalars['String']['input']>
  prompt?: InputMaybe<Scalars['String']['input']>
  promptEnhance?: InputMaybe<Scalars['String']['input']>
  slug: Scalars['String']['input']
  sortOrder?: InputMaybe<Scalars['Int']['input']>
  styleIds?: InputMaybe<Scalars['JSON']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpdateLocationArgs = {
  city?: InputMaybe<Scalars['String']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  currency?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  name?: InputMaybe<Scalars['String']['input']>
  openingHours?: InputMaybe<Array<OpeningHourInput>>
  street?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpdateLocationManualBriefInputArgs = {
  locationId: Scalars['Int']['input']
  quickProfile: Scalars['JSON']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpdateMenuItemCogsBulkArgs = {
  updates: Array<MenuItemCogsUpdateInput>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpdateNodeArgs = {
  data?: InputMaybe<Scalars['JSON']['input']>
  id: Scalars['ID']['input']
  name?: InputMaybe<Scalars['String']['input']>
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUploadSalesReportArgs = {
  file: Scalars['Upload']['input']
  includeLineItems?: Scalars['Boolean']['input']
  locationId: Scalars['ID']['input']
}

/** Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, workspace API adapter tools, and image AI flow configuration. */
export type MutationUpsertMenuItemCogsBulkArgs = {
  analyticsRunId: Scalars['ID']['input']
  items: Array<MenuItemCogsUpsertInput>
}

/** A workflow tree node (workflow, milestone, passcriteria, result, milestonedata, etc.) stored in the polymorphic `node` table. */
export type NodeType = {
  __typename?: 'NodeType'
  data?: Maybe<Scalars['JSON']['output']>
  description?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  locationId?: Maybe<Scalars['Int']['output']>
  name: Scalars['String']['output']
  nodeType: Scalars['String']['output']
  parentId?: Maybe<Scalars['ID']['output']>
  path: Scalars['String']['output']
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

export type PromotionBestPostingWindowType = {
  __typename?: 'PromotionBestPostingWindowType'
  peakDay?: Maybe<Scalars['String']['output']>
  peakHour?: Maybe<Scalars['Int']['output']>
  primaryMealPeriod?: Maybe<Scalars['String']['output']>
}

export type PromotionCandidatesSignalsType = {
  __typename?: 'PromotionCandidatesSignalsType'
  analyticsRunId: Scalars['ID']['output']
  bestPostingWindow?: Maybe<PromotionBestPostingWindowType>
  bestPostingWindowSummary: Scalars['String']['output']
  itemsTotalCount: Scalars['Int']['output']
  itemsTruncated: Scalars['Boolean']['output']
  periodEnd?: Maybe<Scalars['Date']['output']>
  periodStart?: Maybe<Scalars['Date']['output']>
  puzzleOpportunityPool: PromotionPuzzleOpportunityPoolType
  rankedCandidates: Array<PromotionRankedCandidateType>
  rankedCandidatesTotalCount: Scalars['Int']['output']
  topAvoid: Array<PromotionRankedCandidateType>
  topPromote: Array<PromotionRankedCandidateType>
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

export type PromotionPuzzleOpportunityPoolType = {
  __typename?: 'PromotionPuzzleOpportunityPoolType'
  puzzleItemsFound: Scalars['Int']['output']
  selected: Array<PromotionPuzzleSelectedType>
  selectedCount: Scalars['Int']['output']
  threshold: Scalars['Float']['output']
}

export type PromotionPuzzleSelectedType = {
  __typename?: 'PromotionPuzzleSelectedType'
  contributionMarginPct?: Maybe<Scalars['Float']['output']>
  howToPromoteOnInstagram: Array<Scalars['String']['output']>
  matrixAction?: Maybe<Scalars['String']['output']>
  matrixCategory?: Maybe<Scalars['String']['output']>
  menu: Scalars['String']['output']
  menuCategory?: Maybe<Scalars['String']['output']>
  menuCategoryDetail?: Maybe<Scalars['String']['output']>
  peakDay?: Maybe<Scalars['String']['output']>
  peakHour?: Maybe<Scalars['Int']['output']>
  puzzleOpportunityScore: Scalars['Float']['output']
  quantity: Scalars['Int']['output']
  recommendation: Scalars['String']['output']
  score: Scalars['Float']['output']
  signalReasons: Array<Scalars['String']['output']>
  totalRevenue: Scalars['Float']['output']
  whySelected: Array<Scalars['String']['output']>
}

export type PromotionRankedCandidateType = {
  __typename?: 'PromotionRankedCandidateType'
  menu: Scalars['String']['output']
  quantity: Scalars['Int']['output']
  recommendation: Scalars['String']['output']
  score: Scalars['Float']['output']
  signalReasons: Array<Scalars['String']['output']>
  totalRevenue: Scalars['Float']['output']
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

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type Query = {
  __typename?: 'Query'
  /** Fetch metadata and COGS for a single analytics run by ID. */
  analyticsRun?: Maybe<AnalyticsRunType>
  /** List analytics runs for a location, newest first. Use `first` to cap rows (default 100, max 300). */
  analyticsRuns: Array<AnalyticsRunListItemType>
  /** Custom API adapter tools for a workspace. Empty list if the user is not a member. */
  apiAdapterTools: Array<ApiAdapterToolType>
  /** Schedule plan for a Scheduler milestone. Requires a prior campaign brief milestone with structured campaign window data in the same workflow. */
  campaignSchedulePlan?: Maybe<CampaignSchedulePlanType>
  /** Revenue and quantity share per menu category for an analytics run. Returns null when the run has no order lines. */
  categoryMix?: Maybe<CategoryMixPayloadType>
  imageAiFlow?: Maybe<ImageAiFlowType>
  imageAiFlows: Array<ImageAiFlowType>
  /** Composite Instagram signals for an analytics run: content heroes, trending items, avoid list, category focus, best posting window, and period headline. Requires order facts; returns null if none. */
  instagramSignals?: Maybe<InstagramSignalsType>
  /** Fetch one location by id if the caller has access. */
  location?: Maybe<LocationType>
  /** Owner click-first brief hints for a location. Empty quickProfile when unset. Not AI-generated — see locationSocialSettings for AI output. */
  locationManualBriefInput?: Maybe<LocationManualBriefInputType>
  /** Social and brand-voice settings for a location. Returns empty lists and null strings when no row exists. */
  locationSocialSettings?: Maybe<LocationSocialSettingsType>
  /** All locations the current user can access (direct owner or workspace member). */
  locations: Array<LocationType>
  /** Compute the menu engineering BCG matrix for an analytics run. Requires COGS to be set; returns None if no COGS are available. Optionally filter returned items to specific categories (star, puzzle, plow_horse, low_end) — thresholds and distribution always reflect the full dataset. When locationId is set, the run must belong to that location (otherwise returns null). */
  menuEngineeringMatrix?: Maybe<MenuEngineeringMatrixType>
  /** Return hourly and day-of-week demand heatmaps for every menu item in an analytics run. Use this to identify peak selling times per dish. When locationId is set, the run must belong to that location (otherwise returns an empty list). */
  menuHeatmaps: Array<MenuHeatmapType>
  /** Distinct menu items from the latest analytics run for a location: aggregated from order lines (category, avg unit price). Returns null when there is no run or no order data. */
  menuItemsCatalog?: Maybe<MenuCatalogPayloadType>
  /** Distinct menu items from a specific analytics run: aggregated from order lines (quantity, category, avg unit price). Returns null when run is missing/unauthorized or has no order data. */
  menuItemsCatalogForRun?: Maybe<MenuCatalogPayloadType>
  myWorkspace?: Maybe<WorkspaceType>
  /** Fetch a single node by id if the caller owns its location. */
  node?: Maybe<NodeType>
  /** List nodes for a location, optionally filtered by nodeType and/or parentId. Results are paginated with `first` (default and max 500). When parentId is omitted, use `afterId` (last-seen node id) for cursor pagination in primary-key-desc order (aligned with creation order for autoincrement ids). */
  nodes: Array<NodeType>
  operatingProfile?: Maybe<OperatingProfileType>
  /** Compute average order size and revenue for an analytics run. Returns None if the run has no order data. */
  orderMetrics?: Maybe<AnalyticsRunOrderMetricsType>
  /** JSON array of prior milestones' milestonedata payloads: each element is `{"title": string, "presetId": string|null, "data": object|string|array|null}` for milestones strictly before the given milestone in workflow display order. `presetId` is the milestone node's preset when set. `data` is the raw `milestonedata` child `data` field (structured object, legacy string, or null). Empty array when there are no prior milestones or the request is not authorized. */
  priorMilestonesMilestoneData: Scalars['JSON']['output']
  /** Promotion-candidate signals composed from promotion menu items and Instagram signals. Returns ranked recommendations plus puzzle opportunity pool for campaign drafting. */
  promotionCandidatesSignals?: Maybe<PromotionCandidatesSignalsType>
  /** Menu engineering matrix and top star/puzzle slices per distinct `order_fact.menu_category` when present; otherwise one flat matrix on all rows. JSON includes `grouping`, optional `categories`, `rowsSkippedMissingCategory`, and per-slice `matrix` / `topStars` / `topPuzzles`. Returns null when unauthorized, wrong location, or the run has no order facts. */
  promotionEngineeringCandidates?: Maybe<Scalars['JSON']['output']>
  /** Return per-menu promotion signals for an analytics run: volume and revenue, optional BCG-style menu-engineering metrics when COGS allow, and peak hour/day from demand heatmaps. When locationId is set, the run must belong to that location (otherwise returns null). */
  promotionMenuItems?: Maybe<PromotionMenuItemsPayloadType>
  publicHolidays: Array<PublicHolidayType>
  /** Compare per-menu revenue for an analytics run against the previous run for the same location (or an explicit previousRunId). Returns null when the current run has no order lines. */
  revenueTrends?: Maybe<RevenueTrendsPayloadType>
  /** Bill-level revenue and transaction counts rolled up by ISO week for the latest analytics run. Indices are normalized to mean 1.0 within the series. */
  weeklyDemandPattern?: Maybe<WeeklyDemandPatternPayloadType>
  /** Load a workflow node, its milestones (ordered like `nodes`), and each milestone's passcriteria/milestonedata/result children. Returns null if the id is missing, not a workflow, or not owned by the caller. */
  workflowCampaignTree?: Maybe<WorkflowCampaignTreeType>
  workflowExports: Array<WorkflowExportType>
  workspaceMembers: Array<WorkspaceMembershipType>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryAnalyticsRunArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryAnalyticsRunsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
  locationId: Scalars['Int']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryApiAdapterToolsArgs = {
  workspaceId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryCampaignSchedulePlanArgs = {
  analyticsRunId?: InputMaybe<Scalars['ID']['input']>
  locationId: Scalars['Int']['input']
  milestoneId: Scalars['ID']['input']
  workflowId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryCategoryMixArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryImageAiFlowArgs = {
  slug: Scalars['String']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryImageAiFlowsArgs = {
  includeInactive?: Scalars['Boolean']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryInstagramSignalsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryLocationArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryLocationManualBriefInputArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryLocationSocialSettingsArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryLocationsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryMenuEngineeringMatrixArgs = {
  analyticsRunId: Scalars['ID']['input']
  categories?: InputMaybe<Array<Scalars['String']['input']>>
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryMenuHeatmapsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryMenuItemsCatalogArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryMenuItemsCatalogForRunArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryNodeArgs = {
  id: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryNodesArgs = {
  afterId?: InputMaybe<Scalars['ID']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  locationId: Scalars['Int']['input']
  nodeType?: InputMaybe<Scalars['String']['input']>
  parentId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryOperatingProfileArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryOrderMetricsArgs = {
  analyticsRunId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryPriorMilestonesMilestoneDataArgs = {
  locationId: Scalars['Int']['input']
  milestoneId: Scalars['ID']['input']
  workflowId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryPromotionCandidatesSignalsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryPromotionEngineeringCandidatesArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryPromotionMenuItemsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryPublicHolidaysArgs = {
  country: Scalars['String']['input']
  endDate: Scalars['String']['input']
  startDate: Scalars['String']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryRevenueTrendsArgs = {
  analyticsRunId: Scalars['ID']['input']
  locationId?: InputMaybe<Scalars['ID']['input']>
  previousRunId?: InputMaybe<Scalars['ID']['input']>
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryWeeklyDemandPatternArgs = {
  locationId: Scalars['Int']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryWorkflowCampaignTreeArgs = {
  workflowId: Scalars['ID']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryWorkflowExportsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
  locationId: Scalars['Int']['input']
}

/** Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, workspace membership, and custom API adapter tools. */
export type QueryWorkspaceMembersArgs = {
  first?: InputMaybe<Scalars['Int']['input']>
  workspaceId: Scalars['ID']['input']
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

export type WeeklyDemandPatternPayloadType = {
  __typename?: 'WeeklyDemandPatternPayloadType'
  analyticsRunId: Scalars['ID']['output']
  rows: Array<WeeklyDemandPatternRowType>
}

export type WeeklyDemandPatternRowType = {
  __typename?: 'WeeklyDemandPatternRowType'
  isoWeek: Scalars['String']['output']
  relativeDemand: Scalars['String']['output']
  revenueIndex: Scalars['Float']['output']
  txIndex: Scalars['Float']['output']
  weekLabel: Scalars['String']['output']
}

/** Day-of-week demand distribution for a menu item. */
export type WeeklyHeatmapType = {
  __typename?: 'WeeklyHeatmapType'
  day: Scalars['String']['output']
  quantity: Scalars['Int']['output']
}

/** Workflow campaign tree for SSR: workflow root, ordered milestones, and grouped child nodes per milestone (single round-trip vs many `nodes` calls). */
export type WorkflowCampaignTreeType = {
  __typename?: 'WorkflowCampaignTreeType'
  milestones: Array<MilestoneCampaignBundleType>
  workflow: NodeType
}

export type WorkflowExportType = {
  __typename?: 'WorkflowExportType'
  createdAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  locationId: Scalars['Int']['output']
  payload: Scalars['JSON']['output']
  schemaVersion: Scalars['String']['output']
  updatedAt?: Maybe<Scalars['DateTime']['output']>
  workflowId: Scalars['ID']['output']
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
  /** Custom API adapter tools for this workspace. Empty list if the user is not a member. */
  apiAdapterTools: Array<ApiAdapterToolType>
  createdAt?: Maybe<Scalars['DateTime']['output']>
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  ownerClerkUserId: Scalars['String']['output']
}
