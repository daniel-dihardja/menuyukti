/**
 * GraphQL query and mutation strings and response types used by the web app.
 */

import { parseNode, parseNodeNullable, parseNodes, type AnyNode } from './node-schemas'

export type {
  AnyNode,
  KnownNode,
  MilestoneNode,
  PassCriteriaData,
  PassCriteriaNode,
  ResultNode,
  WorkflowNode,
} from './node-schemas'

/** Wire payload from `graphqlQuery` before parsing — use `parseNodeData` / `parseNodesData`. */
export type NodeDataRaw = { node: unknown | null }
export type NodesDataRaw = { nodes: unknown[] }
export type CreateNodeDataRaw = { createNode: unknown }
export type UpdateNodeDataRaw = { updateNode: unknown }

export function parseNodeData(data: NodeDataRaw): { node: AnyNode | null } {
  return { node: parseNodeNullable(data.node) }
}

export function parseNodesData(data: NodesDataRaw): { nodes: AnyNode[] } {
  return { nodes: parseNodes(data.nodes) }
}

export function parseCreateNodeData(data: CreateNodeDataRaw): { createNode: AnyNode } {
  return { createNode: parseNode(data.createNode) }
}

export function parseUpdateNodeData(data: UpdateNodeDataRaw): { updateNode: AnyNode } {
  return { updateNode: parseNode(data.updateNode) }
}

export const LOCATIONS_QUERY = `
  query Locations {
    locations {
      id
      name
      nodeId
    }
  }
`

export type LocationsData = {
  locations: Array<{ id: string; name: string; nodeId: string | null }>
}

export const LOCATION_QUERY = `
  query Location($id: ID!) {
    location(id: $id) {
      id
      name
      street
      city
      country
      currency
      nodeId
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      manualBriefInput {
        locationId
        quickProfile
      }
    }
  }
`

export type LocationData = {
  location: {
    id: string
    name: string
    street: string | null
    city: string | null
    country: string | null
    currency: string | null
    nodeId: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
    manualBriefInput: {
      locationId: number
      quickProfile: Record<string, unknown>
    } | null
  } | null
}

export const UPDATE_LOCATION_MANUAL_BRIEF_MUTATION = `
  mutation UpdateLocationManualBriefInput($locationId: Int!, $quickProfile: JSON!) {
    updateLocationManualBriefInput(locationId: $locationId, quickProfile: $quickProfile) {
      locationId
      quickProfile
    }
  }
`

export type UpdateLocationManualBriefData = {
  updateLocationManualBriefInput: {
    locationId: number
    quickProfile: Record<string, unknown>
  }
}

export const MY_WORKSPACE_QUERY = `
  query MyWorkspace {
    myWorkspace {
      id
      name
      ownerClerkUserId
      createdAt
    }
  }
`

export type MyWorkspaceData = {
  myWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    createdAt: string | null
  } | null
}

export const CREATE_WORKSPACE_MUTATION = `
  mutation CreateWorkspace($name: String!) {
    createWorkspace(name: $name) {
      id
      name
      ownerClerkUserId
      createdAt
    }
  }
`

export type CreateWorkspaceData = {
  createWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    createdAt: string | null
  }
}

export const CREATE_LOCATION_MUTATION = `
  mutation CreateLocation(
    $workspaceId: ID!
    $name: String!
    $street: String
    $city: String
    $country: String
    $currency: String
  ) {
    createLocation(
      workspaceId: $workspaceId
      name: $name
      street: $street
      city: $city
      country: $country
      currency: $currency
    ) {
      id
      name
      nodeId
    }
  }
`

export type CreateLocationData = {
  createLocation: { id: string; name: string; nodeId: string | null }
}

export const UPDATE_LOCATION_MUTATION = `
  mutation UpdateLocation(
    $id: ID!
    $name: String
    $street: String
    $city: String
    $country: String
    $currency: String
    $openingHours: [OpeningHourInput!]
  ) {
    updateLocation(
      id: $id
      name: $name
      street: $street
      city: $city
      country: $country
      currency: $currency
      openingHours: $openingHours
    ) {
      id
      name
      street
      city
      country
      currency
      nodeId
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
    }
  }
`

export type UpdateLocationData = {
  updateLocation: {
    id: string
    name: string
    street: string | null
    city: string | null
    country: string | null
    currency: string | null
    nodeId: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
  }
}

export const CREATE_NODE_MUTATION = `
  mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $description: String, $data: JSON, $parentId: ID) {
    createNode(locationId: $locationId, nodeType: $nodeType, name: $name, description: $description, data: $data, parentId: $parentId) {
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data
    }
  }
`

export type CreateNodeData = {
  createNode: AnyNode
}

export const DELETE_NODE_MUTATION = `
  mutation DeleteNode($id: ID!) {
    deleteNode(id: $id)
  }
`

export type DeleteNodeData = {
  deleteNode: boolean
}

export const UPDATE_NODE_MUTATION = `
  mutation UpdateNode($id: ID!, $name: String, $data: JSON) {
    updateNode(id: $id, name: $name, data: $data) {
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data
    }
  }
`

export type UpdateNodeData = {
  updateNode: AnyNode
}

export const EXPORT_WORKFLOW_MUTATION = `
  mutation ExportWorkflow($workflowId: ID!, $locationId: Int!) {
    exportWorkflow(workflowId: $workflowId, locationId: $locationId) {
      id
      workflowId
      locationId
      payload
      schemaVersion
      createdAt
      updatedAt
    }
  }
`

export type ExportWorkflowDataRaw = {
  exportWorkflow: {
    id: string
    workflowId: string
    locationId: number
    payload: unknown
    schemaVersion: string
    createdAt: string | null
    updatedAt: string | null
  }
}

export const WORKFLOW_EXPORTS_QUERY = `
  query WorkflowExports($locationId: Int!) {
    workflowExports(locationId: $locationId) {
      id
      workflowId
      locationId
      payload
      schemaVersion
      createdAt
      updatedAt
    }
  }
`

export type WorkflowExportsDataRaw = {
  workflowExports: Array<{
    id: string
    workflowId: string
    locationId: number
    payload: unknown
    schemaVersion: string
    createdAt: string | null
    updatedAt: string | null
  }>
}

export const IMPORT_WORKFLOW_MUTATION = `
  mutation ImportWorkflow($locationId: Int!, $payload: JSON!) {
    importWorkflow(locationId: $locationId, payload: $payload) {
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data
    }
  }
`

export type ImportWorkflowDataRaw = {
  importWorkflow: AnyNode
}

export const NODES_QUERY = `
  query Nodes($locationId: Int!, $nodeType: String, $parentId: ID, $first: Int, $afterId: ID) {
    nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId, first: $first, afterId: $afterId) {
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data
    }
  }
`

export type NodesData = {
  nodes: AnyNode[]
}

export const NODE_QUERY = `
  query Node($id: ID!) {
    node(id: $id) {
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data
    }
  }
`

export type NodeData = {
  node: AnyNode | null
}

/** Wire payload for `WORKFLOW_CAMPAIGN_TREE_QUERY` before parsing nodes. */
export type WorkflowCampaignTreeDataRaw = {
  workflowCampaignTree: {
    workflow: unknown
    milestones: Array<{
      milestone: unknown
      passCriteriaNodes: unknown[]
      goalNodes: unknown[]
      milestonedataNodes: unknown[]
      resultNodes: unknown[]
    }>
  } | null
}

const NODE_SELECTION_FIELDS = `
      id
      name
      description
      nodeType
      path
      parentId
      locationId
      data`

export const WORKFLOW_CAMPAIGN_TREE_QUERY = `
  query WorkflowCampaignTree($workflowId: ID!) {
    workflowCampaignTree(workflowId: $workflowId) {
      workflow {
        ${NODE_SELECTION_FIELDS}
      }
      milestones {
        milestone {
          ${NODE_SELECTION_FIELDS}
        }
        passCriteriaNodes {
          ${NODE_SELECTION_FIELDS}
        }
        goalNodes {
          ${NODE_SELECTION_FIELDS}
        }
        milestonedataNodes {
          ${NODE_SELECTION_FIELDS}
        }
        resultNodes {
          ${NODE_SELECTION_FIELDS}
        }
      }
    }
  }
`

export const ANALYTICS_RUNS_BY_LOCATION_QUERY = `
  query AnalyticsRunsByLocation($locationId: Int!, $first: Int) {
    analyticsRuns(locationId: $locationId, first: $first) {
      id
      name
      filename
    }
  }
`

export type AnalyticsRunsByLocationData = {
  analyticsRuns: Array<{ id: string; name: string; filename: string }>
}

/** Run metadata only; omits `menuItemCogs` so the GraphQL resolver skips the COGS query. */
export const ANALYTICS_RUN_METADATA_QUERY = `
  query AnalyticsRunMetadata($id: ID!) {
    analyticsRun(id: $id) {
      id
      name
      filename
      posSystem
      periodStart
      periodEnd
      createdAt
      locationId
    }
  }
`

export type AnalyticsRunMetadataData = {
  analyticsRun: {
    id: string
    name: string
    filename: string
    posSystem: string
    periodStart: string | null
    periodEnd: string | null
    createdAt: string
    locationId: number
  } | null
}

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
`

export type AnalyticsRunData = {
  analyticsRun: {
    id: string
    name: string
    filename: string
    posSystem: string
    periodStart: string | null
    periodEnd: string | null
    createdAt: string
    locationId: number
    menuItemCogs: Array<{
      id: number
      analyticsRunId: number
      menu: string
      menuCategory: string | null
      menuCategoryDetail: string | null
      cogs: number
      currency: string | null
    }>
  } | null
}

export const MENU_ENGINEERING_MATRIX_QUERY = `
  query MenuEngineeringMatrix($id: ID!, $categories: [String!], $locationId: ID) {
    menuEngineeringMatrix(analyticsRunId: $id, categories: $categories, locationId: $locationId) {
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
`

export type MenuEngineeringMatrixData = {
  menuEngineeringMatrix: {
    thresholds: {
      avgPopularity: number
      avgContributionMargin: number
      totalCogs: number
      totalProfit: number
      totalMargin: number
    }
    distribution: Array<{
      category: string
      itemCount: number
      itemShare: number
      marginShare: number
    }>
    items: Array<{
      menu: string
      quantity: number
      totalRevenue: number
      cogs: number
      totalCogs: number
      contributionMargin: number
      contributionMarginPercentage: number
      marginPerUnit: number
      weValue: number
      category: string
      action: string
      menuCategory: string | null
      menuCategoryDetail: string | null
    }>
  } | null
}

export const MENU_ITEMS_CATALOG_QUERY = `
  query MenuItemsCatalog($locationId: Int!) {
    menuItemsCatalog(locationId: $locationId) {
      analyticsRunId
      items {
        id
        name
        category
        categoryDetail
        price
        isActive
      }
    }
  }
`

export type MenuItemsCatalogData = {
  menuItemsCatalog: {
    analyticsRunId: string
    items: Array<{
      id: string
      name: string
      category: string
      categoryDetail: string | null
      price: number
      isActive: boolean
    }>
  } | null
}

export const MENU_HEATMAPS_QUERY = `
  query MenuHeatmaps($id: ID!, $locationId: ID) {
    menuHeatmaps(analyticsRunId: $id, locationId: $locationId) {
      menu
      menuCategory
      menuCategoryDetail
      reportingPeriod
      dailyHeatmap { hour quantity }
      weeklyHeatmap { day quantity }
    }
  }
`

export type MenuHeatmapsData = {
  menuHeatmaps: Array<{
    menu: string
    menuCategory: string | null
    menuCategoryDetail: string | null
    reportingPeriod: string
    dailyHeatmap: Array<{ hour: number; quantity: number }>
    weeklyHeatmap: Array<{ day: string; quantity: number }>
  }>
}

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
`

export type PublicHolidayItem = {
  id: string
  date: string
  name: string
  localName: string
  holidayType: string
  isTentative: boolean
}

export type PublicHolidaysData = {
  publicHolidays: PublicHolidayItem[]
}

export const IMAGE_AI_FLOWS_QUERY = `
  query ImageAiFlows($includeInactive: Boolean = false) {
    imageAiFlows(includeInactive: $includeInactive) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
      sortOrder
    }
  }
`

export type ImageAiFlowsData = {
  imageAiFlows: Array<{
    id: number
    slug: string
    displayName: string
    prompt: string
    model: string
    promptEnhance: string | null
    imageReferenceStrength: string | null
    styleIds: unknown
    isActive: boolean
    sortOrder: number
  }>
}

export const IMAGE_AI_FLOW_BY_SLUG_QUERY = `
  query ImageAiFlow($slug: String!) {
    imageAiFlow(slug: $slug) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
    }
  }
`

export type ImageAiFlowBySlugData = {
  imageAiFlow: {
    id: number
    slug: string
    displayName: string
    prompt: string
    model: string
    promptEnhance: string | null
    imageReferenceStrength: string | null
    styleIds: unknown
    isActive: boolean
  } | null
}

/** Single image AI flow row returned by mutations and list query. */
export type ImageAiFlowRow = {
  id: number
  slug: string
  displayName: string
  prompt: string
  model: string
  promptEnhance: string | null
  imageReferenceStrength: string | null
  styleIds: unknown
  isActive: boolean
  sortOrder: number
}

export const CREATE_IMAGE_AI_FLOW_MUTATION = `
  mutation CreateImageAiFlow(
    $slug: String!
    $displayName: String!
    $prompt: String!
    $model: String!
    $promptEnhance: String
    $imageReferenceStrength: String
    $styleIds: JSON
    $isActive: Boolean!
    $sortOrder: Int!
  ) {
    createImageAiFlow(
      slug: $slug
      displayName: $displayName
      prompt: $prompt
      model: $model
      promptEnhance: $promptEnhance
      imageReferenceStrength: $imageReferenceStrength
      styleIds: $styleIds
      isActive: $isActive
      sortOrder: $sortOrder
    ) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
      sortOrder
    }
  }
`

export type CreateImageAiFlowData = {
  createImageAiFlow: ImageAiFlowRow
}

export const UPDATE_IMAGE_AI_FLOW_MUTATION = `
  mutation UpdateImageAiFlow(
    $slug: String!
    $newSlug: String
    $displayName: String
    $prompt: String
    $model: String
    $promptEnhance: String
    $imageReferenceStrength: String
    $styleIds: JSON
    $isActive: Boolean
    $sortOrder: Int
  ) {
    updateImageAiFlow(
      slug: $slug
      newSlug: $newSlug
      displayName: $displayName
      prompt: $prompt
      model: $model
      promptEnhance: $promptEnhance
      imageReferenceStrength: $imageReferenceStrength
      styleIds: $styleIds
      isActive: $isActive
      sortOrder: $sortOrder
    ) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
      sortOrder
    }
  }
`

export type UpdateImageAiFlowData = {
  updateImageAiFlow: ImageAiFlowRow
}

export const DELETE_IMAGE_AI_FLOW_MUTATION = `
  mutation DeleteImageAiFlow($slug: String!) {
    deleteImageAiFlow(slug: $slug)
  }
`

export type DeleteImageAiFlowData = {
  deleteImageAiFlow: boolean
}

export type ApiAdapterToolRow = {
  id: string
  workspaceId: string
  toolKey: string
  name: string
  description: string
  url: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Single round-trip for the custom-tools page (workspace + tools). */
export const MY_WORKSPACE_WITH_API_ADAPTER_TOOLS_QUERY = `
  query MyWorkspaceWithApiAdapterTools {
    myWorkspace {
      id
      name
      ownerClerkUserId
      createdAt
      apiAdapterTools {
        id
        workspaceId
        toolKey
        name
        description
        url
        isActive
        createdAt
        updatedAt
      }
    }
  }
`

export type MyWorkspaceWithApiAdapterToolsData = {
  myWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    createdAt: string | null
    apiAdapterTools: ApiAdapterToolRow[]
  } | null
}

export const CREATE_API_ADAPTER_TOOL_MUTATION = `
  mutation CreateApiAdapterTool(
    $workspaceId: ID!
    $name: String!
    $description: String!
    $url: String!
    $isActive: Boolean!
  ) {
    createApiAdapterTool(
      workspaceId: $workspaceId
      name: $name
      description: $description
      url: $url
      isActive: $isActive
    ) {
      id
      workspaceId
      toolKey
      name
      description
      url
      isActive
      createdAt
      updatedAt
    }
  }
`

export type CreateApiAdapterToolData = {
  createApiAdapterTool: ApiAdapterToolRow
}

export const UPDATE_API_ADAPTER_TOOL_MUTATION = `
  mutation UpdateApiAdapterTool(
    $id: ID!
    $name: String
    $description: String
    $url: String
    $isActive: Boolean
  ) {
    updateApiAdapterTool(id: $id, name: $name, description: $description, url: $url, isActive: $isActive) {
      id
      workspaceId
      toolKey
      name
      description
      url
      isActive
      createdAt
      updatedAt
    }
  }
`

export type UpdateApiAdapterToolData = {
  updateApiAdapterTool: ApiAdapterToolRow
}

export const DELETE_API_ADAPTER_TOOL_MUTATION = `
  mutation DeleteApiAdapterTool($id: ID!) {
    deleteApiAdapterTool(id: $id)
  }
`

export type DeleteApiAdapterToolData = {
  deleteApiAdapterTool: boolean
}
