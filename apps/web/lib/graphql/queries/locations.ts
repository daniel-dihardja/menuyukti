export const LOCATIONS_LIST_QUERY = `
  query LocationsList($first: Int) {
    locations(first: $first) {
      id
      name
      nodeId
      street
      city
      country
      currency
      areas {
        id
        name
        sortOrder
      }
    }
  }
`

export type LocationArea = {
  id: string
  name: string
  sortOrder: number
}

export const LOCATIONS_QUERY = `
  query Locations($first: Int) {
    locations(first: $first) {
      id
      name
      nodeId
      city
      country
      currency
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      areas {
        id
        name
        sortOrder
      }
    }
  }
`

export type LocationsListData = {
  locations: Array<{
    id: string
    name: string
    nodeId: string | null
    street: string | null
    city: string | null
    country: string | null
    currency: string | null
    areas: LocationArea[]
  }>
}

export const LOCATION_ANALYTICS_SUMMARIES_QUERY = `
  query LocationAnalyticsSummaries($locationIds: [Int!]!) {
    locationAnalyticsSummaries(locationIds: $locationIds) {
      locationId
      runCount
      latestRun {
        id
        name
      }
    }
  }
`

export type LocationAnalyticsSummariesData = {
  locationAnalyticsSummaries: Array<{
    locationId: number
    runCount: number
    latestRun: { id: string; name: string } | null
  }>
}

export type LocationsData = {
  locations: Array<{
    id: string
    name: string
    nodeId: string | null
    city: string | null
    country: string | null
    currency: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
    areas: LocationArea[]
  }>
}

export const LOCATION_QUERY = `
  query Location($id: ID!) {
    location(id: $id) {
      id
      name
      publicSlug
      street
      city
      country
      currency
      legalName
      taxNumber
      vatId
      nodeId
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      areas {
        id
        name
        sortOrder
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
    publicSlug: string | null
    street: string | null
    city: string | null
    country: string | null
    currency: string | null
    legalName: string | null
    taxNumber: string | null
    vatId: string | null
    nodeId: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
    areas: LocationArea[]
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
      plan
      createdAt
    }
  }
`

export type MyWorkspaceData = {
  myWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    plan: string
    createdAt: string | null
  } | null
}

export const ENSURE_MY_WORKSPACE_MUTATION = `
  mutation EnsureMyWorkspace {
    ensureMyWorkspace {
      id
      name
      ownerClerkUserId
      plan
      createdAt
    }
  }
`

export type EnsureMyWorkspaceData = {
  ensureMyWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    plan: string
    createdAt: string | null
  }
}

export const PROVISION_WORKSPACE_MUTATION = `
  mutation ProvisionWorkspace($ownerClerkUserId: String!, $name: String!, $plan: String) {
    provisionWorkspace(ownerClerkUserId: $ownerClerkUserId, name: $name, plan: $plan) {
      id
      name
      ownerClerkUserId
      plan
      createdAt
    }
  }
`

export type ProvisionWorkspaceData = {
  provisionWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    plan: string
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
    $publicSlug: String
  ) {
    createLocation(
      workspaceId: $workspaceId
      name: $name
      street: $street
      city: $city
      country: $country
      currency: $currency
      publicSlug: $publicSlug
    ) {
      id
      name
      publicSlug
      nodeId
    }
  }
`

export type CreateLocationData = {
  createLocation: {
    id: string
    name: string
    publicSlug: string | null
    nodeId: string | null
  }
}

export const UPDATE_LOCATION_MUTATION = `
  mutation UpdateLocation(
    $id: ID!
    $name: String
    $street: String
    $city: String
    $country: String
    $currency: String
    $publicSlug: String
    $openingHours: [OpeningHourInput!]
  ) {
    updateLocation(
      id: $id
      name: $name
      street: $street
      city: $city
      country: $country
      currency: $currency
      publicSlug: $publicSlug
      openingHours: $openingHours
    ) {
      id
      name
      street
      city
      country
      currency
      publicSlug
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
    publicSlug: string | null
    nodeId: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
  }
}

export const DELETE_LOCATION_MUTATION = `
  mutation DeleteLocation($id: ID!) {
    deleteLocation(id: $id)
  }
`

export type DeleteLocationData = {
  deleteLocation: boolean
}

export const CREATE_LOCATION_AREA_MUTATION = `
  mutation CreateLocationArea($locationId: Int!, $name: String!, $sortOrder: Int) {
    createLocationArea(locationId: $locationId, name: $name, sortOrder: $sortOrder) {
      id
      locationId
      name
      sortOrder
    }
  }
`

export type CreateLocationAreaData = {
  createLocationArea: {
    id: string
    locationId: string
    name: string
    sortOrder: number
  }
}

export const UPDATE_LOCATION_AREA_MUTATION = `
  mutation UpdateLocationArea($id: Int!, $name: String, $sortOrder: Int) {
    updateLocationArea(id: $id, name: $name, sortOrder: $sortOrder) {
      id
      locationId
      name
      sortOrder
    }
  }
`

export type UpdateLocationAreaData = {
  updateLocationArea: {
    id: string
    locationId: string
    name: string
    sortOrder: number
  }
}

export const DELETE_LOCATION_AREA_MUTATION = `
  mutation DeleteLocationArea($id: Int!) {
    deleteLocationArea(id: $id)
  }
`

export type DeleteLocationAreaData = {
  deleteLocationArea: boolean
}

export type LocationAdvisorMemory = {
  locationId: number
  content: string
  updatedAt: string | null
}

export const LOCATION_ADVISOR_MEMORY_QUERY = `
  query LocationAdvisorMemory($id: ID!) {
    location(id: $id) {
      id
      advisorMemory {
        locationId
        content
        updatedAt
      }
    }
  }
`

export type LocationAdvisorMemoryData = {
  location: {
    id: string
    advisorMemory: LocationAdvisorMemory | null
  } | null
}

export const UPDATE_LOCATION_ADVISOR_MEMORY_MUTATION = `
  mutation UpdateLocationAdvisorMemory($locationId: Int!, $content: String!) {
    updateLocationAdvisorMemory(locationId: $locationId, content: $content) {
      locationId
      content
      updatedAt
    }
  }
`

export type UpdateLocationAdvisorMemoryData = {
  updateLocationAdvisorMemory: LocationAdvisorMemory
}
