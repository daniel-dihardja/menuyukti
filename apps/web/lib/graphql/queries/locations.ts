export const LOCATIONS_LIST_QUERY = `
  query LocationsList($first: Int) {
    locations(first: $first) {
      id
      name
      nodeId
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
