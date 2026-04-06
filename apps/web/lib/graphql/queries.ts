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
      nodeId
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
    nodeId: string | null
  } | null
}

export const CREATE_LOCATION_MUTATION = `
  mutation CreateLocation($name: String!) {
    createLocation(name: $name) {
      id
      name
      nodeId
    }
  }
`

export type CreateLocationData = {
  createLocation: { id: string; name: string; nodeId: string | null }
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

export const NODES_QUERY = `
  query Nodes($locationId: Int!, $nodeType: String, $parentId: ID) {
    nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId) {
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

export const ANALYTICS_RUNS_BY_LOCATION_QUERY = `
  query AnalyticsRunsByLocation($locationId: Int!) {
    analyticsRuns(locationId: $locationId) {
      id
      name
      filename
    }
  }
`

export type AnalyticsRunsByLocationData = {
  analyticsRuns: Array<{ id: string; name: string; filename: string }>
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
